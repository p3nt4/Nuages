// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
const srs = require('secure-random-string');

const error = require('@feathersjs/errors');

var net = require('net');

module.exports = function (options = {}) {
  return async context => {
    
    var data = {};

    //  Data validation
    data._id = srs({length: 32, alphanumeric: true});
    
    data.bufferSize = parseInt(context.data.bufferSize) ? parseInt(context.data.bufferSize) : 4096;

    data.type = context.data.type;

    data.destination = context.data.destination;

    data.implantId = context.data.implantId;

    data.jobOptions = context.data.jobOptions ? context.data.jobOptions : {};

    var server = net.createServer(function(socket) {
      try{
        pipe_id = srs({length: 32, alphanumeric: true});
        socket.on('error', function(e) {
          //console.log("SOCKET ERROR  " + pipe_id);
        });
        socket.on('end', function(e) {
          try{
              //console.log("SOCKET END  " + pipe_id);
              context.app.service('pipes').remove(pipe_id).catch((err) => {});
          }catch(e){};
        });


        if(context.app.pipe_list == undefined){
          context.app.pipe_list = {};
        }
        context.app.pipe_list[pipe_id]={
          bufferSize : data.bufferSize,
          in: socket, 
          out: socket
        };
        var jobOptions = data.jobOptions;

        jobOptions.pipe_id=pipe_id;

        jobOptions.bufferSize=data.bufferSize;

        context.app.service('pipes').create({
          tunnelId:data._id, 
          _id:pipe_id, 
          type: data.type,
          implantId: data.implantId, 
          destination: data.destination, 
          bufferSize: data.bufferSize
        }).then((pipe)=>{
          context.app.service('jobs').create({
            implantId: data.implantId,
            pipe_id: pipe_id,
            payload:{
              type: data.type,
              options: jobOptions
            },
            timeout : Date.now() + 60000 // 60 Seconds timeout
          });

        });
      }catch(e){};
    });
    
    if(context.app.server_list == undefined){
      context.app.server_list = {};
    }

    server.listen(parseInt(context.data.port), '0.0.0.0');
    context.app.server_list[data._id]=server;

    server.on('listening',()=>{
      console.log("Created tcp server on: " + server._connectionKey.replace("4:",""));
    });

    server.on('error',(err)=>{
      console.log("Server Failed: " + server._connectionKey.replace("4:",""));
      console.log(err);
    });

    context.data = data;
  
    return context;
  };
};
