// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

const error = require('@feathersjs/errors');

var net = require('net');

const srs = require('secure-random-string');

module.exports = function (options = {}) {
  return async context => {
    
    // If the runId attribute is there, the callback is intended for a module
    // This had not been tested yet but would allow for implants to communicate with modules during execution
    if(context.data.runId){

      context.app.service("/modules/run").get(context.result.moduleRun.runId).then((moduleRun)=>{

        moduleFile = require("../../modules/"+moduleRun.moduleName);

        moduleFile[context.data.callback](context.app, moduleRun, context.data.data);

      }).catch((e) => {

        console.log(e);

        moduleRun.runStatus = 4;

        moduleRun.log.push({
          type: 1,
          message: e.message,
          time: Date.now()}
        );

        context.app.service("/modules/run").patch(moduleRun._id, moduleRun);
    });
    }
    
    // Eventually callbacks should be placed somewhere else and loaded dynamically for modularity but for now this will do
    // This callback is used for reverse tcp, to open a connection and get the Pipe ID
    else if(context.data.callback == "rev_tcp_open"){
      var result = {};
      var tunnel = await context.app.service("/tunnels").get(context.data.data.tunnelId).catch((err) => {});
      if(tunnel === undefined){
        result.error = true;
        result.mustClose = true;
        result.errorMessage = "Tunnel not found";
      }else{
        destinationArr = tunnel.destination.split(":");
        if(destinationArr.length < 2){
          result.error = true;
          result.errorMessage = "Destination format invalid";
        }else{
          var client = new net.Socket();
          var pipes = await context.app.service("pipes").find({query:{tunnelId: tunnel._id}});
            if(pipes.total >= tunnel.maxPipes){
              console.log("Too many pipes on tunnel: " + tunnel._id);
              result.error = true;
              result.errorMessage = "Too many pipes on tunnel";
            }
            else{
              var pipe_id = srs({length: 32, alphanumeric: true});
              var pipe = await context.app.service('pipes').create({
                tunnelId:tunnel._id,  
                type: "rev_tcp",
                _id: pipe_id,
                implantId: tunnel.implantId,
                source: tunnel.destination,
                destination:  context.data.data.source,
                bufferSize: tunnel.bufferSize
              });
              client.connect(parseInt(destinationArr[1]), destinationArr[0], function() {
              });
              if(tunnel.timeout != null){
                socket.setTimeout(tunnel.timeout, function(e) {
                  try{
                      console.log("TCP connection timed out");
                      context.app.service('pipes').remove(pipe._id).catch((err) => {});
                  }catch(e){};
                });
              }
              client.on('error', function(e) {
                try{
                  context.app.service('pipes').remove(pipe._id).catch((err) => {});
              }catch(e){};
              });
              client.on('end', function(e) {
                try{
                    context.app.service('pipes').remove(pipe._id).catch((err) => {});
                }catch(e){};
              });
              context.app.pipe_list[pipe._id]={
                bufferSize : tunnel.bufferSize,
                in: client, 
                out: client,
                canRead: true,
                canWrite: true
              };
              result.error = false;
              result.pipe_id = pipe_id;
              
            }

        }
      }
    }
    else if(context.data.callback == "pipe_close"){
      var result = {};
      context.app.service('pipes').remove(context.data.data.pipe_id).catch((err) => {});
    }
    else{
      throw new error.NotFound("Callback not found"); 
    }

    context.data = result;
    return context;
  };
};
