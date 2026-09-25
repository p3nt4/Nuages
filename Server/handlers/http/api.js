const handlerHelper = require("../../src/handlerHelper");

const fs = require("fs");
const http = require("http");
const https = require("https");
const { URL } = require("url");

function readOption(run, key, fallback) {
  if (!run || !run.options || !run.options[key]) {
    return fallback;
  }

  var value = run.options[key].value;
  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value);
}

function readBooleanOption(run, key, fallback) {
  var raw = readOption(run, key, fallback ? "true" : "false");
  return String(raw).trim().toLowerCase() === "true";
}

function parseHeaderList(value, fallback) {
  var raw = String(value === undefined || value === null ? fallback : value);
  return raw
    .split(",")
    .map(function mapHeader(entry) {
      return entry.trim().toLowerCase();
    })
    .filter(function keepHeader(entry) {
      return entry.length > 0;
    });
}

function parseExtraHeadersJson(rawValue) {
  var raw = String(rawValue === undefined || rawValue === null ? "{}" : rawValue).trim();
  if (!raw) {
    return {};
  }

  var parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("response_headers_json must be a JSON object");
  }

  var normalized = {};
  var keys = Object.keys(parsed);
  for (var i = 0; i < keys.length; i += 1) {
    normalized[String(keys[i]).toLowerCase()] = String(parsed[keys[i]]);
  }

  return normalized;
}

function ensureServerMap(app) {
  if (!app.node_listener_servers) {
    app.node_listener_servers = {};
  }

  return app.node_listener_servers;
}

function sanitizeProxyHeaders(headers, listenerId) {
  var nextHeaders = {};
  var keys = Object.keys(headers || {});

  for (var i = 0; i < keys.length; i += 1) {
    var key = keys[i];
    if (key === "host" || key === "content-length") {
      continue;
    }
    nextHeaders[key] = headers[key];
  }

  // Preserve listener tracking for server-side hooks.
  if (!nextHeaders.listener) {
    nextHeaders.listener = listenerId;
  }

  return nextHeaders;
}

function buildProxyRequestOptions(req, upstreamUrl, listenerId, bodyLength) {
  var headers = sanitizeProxyHeaders(req.headers, listenerId);

  if (bodyLength > 0) {
    headers["content-length"] = String(bodyLength);
  }

  return {
    protocol: upstreamUrl.protocol,
    hostname: upstreamUrl.hostname,
    port: upstreamUrl.port || (upstreamUrl.protocol === "https:" ? 443 : 80),
    method: req.method,
    path: upstreamUrl.pathname + upstreamUrl.search,
    headers: headers
  };
}

function applyResponseHeaderPolicy(headers, policy) {
  var nextHeaders = Object.assign({}, headers || {});
  var keys = Object.keys(nextHeaders);

  for (var i = 0; i < keys.length; i += 1) {
    var key = keys[i];
    if (policy.stripResponseHeaders.indexOf(String(key).toLowerCase()) !== -1) {
      delete nextHeaders[key];
    }
  }

  if (policy.omitDateHeader) {
    var dateKeys = Object.keys(nextHeaders);
    for (var j = 0; j < dateKeys.length; j += 1) {
      if (String(dateKeys[j]).toLowerCase() === "date") {
        delete nextHeaders[dateKeys[j]];
      }
    }
  }

  var extraHeaderKeys = Object.keys(policy.extraResponseHeaders);
  for (var h = 0; h < extraHeaderKeys.length; h += 1) {
    nextHeaders[extraHeaderKeys[h]] = policy.extraResponseHeaders[extraHeaderKeys[h]];
  }

  return nextHeaders;
}

function writeJson(res, statusCode, payload, policy) {
  if (policy.omitDateHeader) {
    res.sendDate = false;
  }

  var headers = applyResponseHeaderPolicy(
    {
      "content-type": "application/json; charset=utf-8"
    },
    policy
  );

  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(payload));
}

function proxyImplantRequest(app, req, res, run, baseUri, policy) {
  var chunks = [];

  req.on("data", function onData(chunk) {
    chunks.push(chunk);
  });

  req.on("end", function onEnd() {
    var requestBody = Buffer.concat(chunks);
    var upstreamUrl = new URL(req.url, baseUri);
    var proxyOptions = buildProxyRequestOptions(req, upstreamUrl, run._id, requestBody.length);
    var requestModule = upstreamUrl.protocol === "https:" ? https : http;

    var upstreamRequest = requestModule.request(proxyOptions, function onUpstreamResponse(upstreamResponse) {
      var responseHeaders = Object.assign({}, upstreamResponse.headers);
      delete responseHeaders["transfer-encoding"];
      delete responseHeaders.connection;

      responseHeaders = applyResponseHeaderPolicy(responseHeaders, policy);

      if (policy.omitDateHeader) {
        res.sendDate = false;
      }

      res.writeHead(upstreamResponse.statusCode || 500, responseHeaders);
      upstreamResponse.pipe(res);
    });

    upstreamRequest.on("error", function onProxyError(error) {
      handlerHelper.logError(app, run, "Upstream proxy request failed: " + error.message);
      writeJson(res, 502, {
        error: "bad_gateway",
        message: "Failed to reach upstream implant API",
        details: error.message
      }, policy);
    });

    if (requestBody.length > 0) {
      upstreamRequest.write(requestBody);
    }

    upstreamRequest.end();
  });

  req.on("error", function onRequestError(error) {
    writeJson(res, 400, {
      error: "invalid_request",
      message: error.message
    }, policy);
  });
}

function createProxyServer(app, run, baseUri, tlsKeyPath, tlsCertPath, policy) {
  var requestHandler = function requestHandler(req, res) {
    if (!req.url || req.url.indexOf("/implant/") !== 0) {
      writeJson(res, 404, {
        error: "not_found",
        message: "This listener only exposes /implant/* APIs"
      }, policy);
      return;
    }

    proxyImplantRequest(app, req, res, run, baseUri, policy);
  };

  if (!tlsKeyPath && !tlsCertPath) {
    return http.createServer(requestHandler);
  }

  if (!tlsKeyPath || !tlsCertPath) {
    throw new Error("Both key and cert are required to enable HTTPS");
  }

  return https.createServer(
    {
      key: fs.readFileSync(tlsKeyPath),
      cert: fs.readFileSync(tlsCertPath)
    },
    requestHandler
  );
}

// This function returns the handler object to be loaded in the database
exports.load = function (app) {
  var handler = {
    name: "http/api",
    options: {
      port: {
        value: "8080",
        required: true,
        description: "The port to listen on"
      },
      listen_ip: {
        value: "0.0.0.0",
        required: true,
        description: "The IP to bind to"
      },
      uri: {
        value: "http://127.0.0.1:3030",
        required: true,
        description: "The URI of the Nuages API"
      },
      key: {
        value: "",
        required: false,
        description: "Path to a TLS private key (PEM). Leave empty for HTTP"
      },
      cert: {
        value: "",
        required: false,
        description: "Path to a TLS certificate (PEM). Leave empty for HTTP"
      },
      strip_response_headers: {
        value: "server,x-powered-by,via",
        required: false,
        description: "Comma-separated response headers to remove (case-insensitive)"
      },
      response_headers_json: {
        value: "{}",
        required: false,
        description: "JSON object of response headers to add/override"
      },
      omit_date_header: {
        value: "true",
        required: false,
        description: "When true, suppresses the Date header"
      }
    },
    description: "Node.js listener exposing only implant APIs over HTTP/HTTPS",
    external: false
  };

  return handler;
};

// This is the first function to be called when the handler is run
exports.run = async function (app, run) {
  var baseUri = readOption(run, "uri", "http://127.0.0.1:3030").trim();
  var listenIp = readOption(run, "listen_ip", "0.0.0.0").trim();
  var portRaw = readOption(run, "port", "8080").trim();
  var tlsKeyPath = readOption(run, "key", "").trim();
  var tlsCertPath = readOption(run, "cert", "").trim();
  var stripResponseHeadersRaw = readOption(run, "strip_response_headers", "server,x-powered-by,via");
  var responseHeadersJsonRaw = readOption(run, "response_headers_json", "{}");
  var omitDateHeader = readBooleanOption(run, "omit_date_header", true);
  var port = parseInt(portRaw, 10);

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    handlerHelper.logError(app, run, "Invalid port configured: " + portRaw);
    handlerHelper.fail(app, run);
    return;
  }

  try {
    var upstreamUrl = new URL(baseUri);
    if (upstreamUrl.protocol !== "http:" && upstreamUrl.protocol !== "https:") {
      throw new Error("Upstream URI must use http or https");
    }
  } catch (error) {
    handlerHelper.logError(app, run, "Invalid upstream URI: " + baseUri + " (" + error.message + ")");
    handlerHelper.fail(app, run);
    return;
  }

  var listeners = ensureServerMap(app);

  var responsePolicy;
  try {
    responsePolicy = {
      stripResponseHeaders: parseHeaderList(stripResponseHeadersRaw, "server,x-powered-by,via"),
      extraResponseHeaders: parseExtraHeadersJson(responseHeadersJsonRaw),
      omitDateHeader: omitDateHeader
    };
  } catch (error) {
    handlerHelper.logError(app, run, "Invalid header policy options: " + error.message);
    handlerHelper.fail(app, run);
    return;
  }

  if (listeners[run._id]) {
    handlerHelper.logError(app, run, "Listener server is already running for this listener id");
    handlerHelper.fail(app, run);
    return;
  }

  try {
    var server = createProxyServer(app, run, baseUri, tlsKeyPath, tlsCertPath, responsePolicy);
    listeners[run._id] = server;

    await new Promise(function onListen(resolve, reject) {
      server.once("error", reject);
      server.listen(port, listenIp, function onStarted() {
        server.removeListener("error", reject);
        resolve();
      });
    });

    run.pid = process.pid;
    run.listen_ip = listenIp;
    run.listen_port = port;

    handlerHelper.logInfo(app, run, "Node implant listener started on " + (tlsKeyPath ? "https" : "http") + "://" + listenIp + ":" + port.toString());
    handlerHelper.running(app, run);
  } catch (error) {
    delete listeners[run._id];
    handlerHelper.logError(app, run, "Failed to start node implant listener: " + error.message);
    handlerHelper.fail(app, run);
  }
};

// This is the function to be called when the handler is stopped
exports.stop = async function (app, run) {
  var listeners = ensureServerMap(app);
  var server = listeners[run._id];

  if (!server) {
    handlerHelper.logInfo(app, run, "Node implant listener was not running");
    handlerHelper.stopped(app, run);
    return;
  }

  await new Promise(function onClose(resolve) {
    var finished = false;

    function complete() {
      if (finished) {
        return;
      }
      finished = true;
      resolve();
    }

    server.close(function onClosed() {
      complete();
    });

    // Ensure we do not stay stuck if keep-alive sockets never close.
    setTimeout(function onTimeout() {
      complete();
    }, 3000);
  });

  delete listeners[run._id];

  handlerHelper.logInfo(app, run, "Stopped node implant listener");
  handlerHelper.stopped(app, run);
};
