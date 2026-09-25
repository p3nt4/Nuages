var bodyParser = require('body-parser');
const compress = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./logger');

const feathers = require('@feathersjs/feathers');
const configuration = require('@feathersjs/configuration');
const express = require('@feathersjs/express');
const socketio = require('@feathersjs/socketio');
const { NotFound } = require('@feathersjs/errors');

const middleware = require('./middleware');
const services = require('./services');
const appHooks = require('./app.hooks');
const channels = require('./channels');

const mongodb = require('./mongodb');
const authentication = require('./authentication');

const MEDIA_LIMIT = '100mb';
const app = express(feathers());

// Application bootstrap: load config first so later middleware and services can rely on
// environment-specific values such as host, port and public folder paths.
app.configure(configuration());

// Security and transport defaults. These protect the app and keep large implant/file uploads
// available without overloading the request parser.
app.use(helmet());
app.use(cors());
app.use(compress());
app.use(express.json({ limit: MEDIA_LIMIT, extended: true }));
app.use(express.urlencoded({ limit: MEDIA_LIMIT, extended: true }));
app.use(bodyParser.raw({
  type: 'application/octet-stream',
  limit: MEDIA_LIMIT,
  extended: true,
}));

// This causes a issue for now
// app.use(favicon(path.join(app.get('public'), 'favicon.ico')));

// Serve the built HTML/UI with a small, safe cache to reduce repeated payload work for static files.
app.use('/', express.static(app.get('public'), {
  index: 'index.html',
  maxAge: '1h',
}));

app.configure(express.rest(function(req, res) {
  if (res.hook.path === 'implant/bin/:pipeId') {
    res.type('application/octet-stream');
  }
  res.send(res.data);
}));

app.configure(socketio());
app.configure(mongodb);

// Configure middleware, authentication and application services in a predictable order.
app.configure(middleware);
app.configure(authentication);
app.configure(services);
app.configure(channels);

// Keep the legacy HTML 404 semantics while preserving JSON NotFound responses for API callers.
// This must run after routes/services are registered so valid endpoints are not intercepted.
app.use((req, res, next) => {
  if (req.accepts('html')) {
    return res.status(404).type('html').send('<html><body><h1>404 Page not found</h1></body></html>');
  }

  return next(new NotFound('Page not found'));
});

// Configure a middleware for 404s and the error handler.
app.use(express.errorHandler({ logger }));

app.hooks(appHooks);

module.exports = app;
