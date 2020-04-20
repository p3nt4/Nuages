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

    var server = net.createServer(function(socket) {
      try{
        pipe_id = srs({length: 32, alphanumeric: true});
        socket.on('error', function(e) {
          try{
              context.app.service('pipes').remove(pipe_id).catch((err) => {
                console.log(err);
              });
          }catch(e){console.log(e)};
        });
        if(context.app.pipe_list == undefined){
          context.app.pipe_list = {};
        }
        context.app.pipe_list[pipe_id]={
          bufferSize : data.bufferSize,
          in: socket, 
          out: socket
        };
        context.app.service('pipes').create({tunnelId:data._id, _id:pipe_id});
      }catch(e){};
    });
    
    server.listen(parseInt(context.data.port), '127.0.0.1');

    server.on('listening',()=>{
      console.log("Created tcp server on: " + server._connectionKey.replace("4:",""));
    });

    context.data = data;

    return context;
  };
};
