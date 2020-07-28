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

    data.id = data._id;
    
    data.bufferSize = parseInt(context.data.bufferSize) ? parseInt(context.data.bufferSize) : 4096;

    data.type = context.data.type;

    data.destination = context.data.destination;

    data.implantId = context.data.implantId;

    data.jobOptions = context.data.jobOptions ? context.data.jobOptions : {};

    data.port = parseInt(context.data.port);

    data.bindIP = context.data.bindIP ? context.data.bindIP : "127.0.0.1";

    data.maxPipes = context.data.maxPipes ? parseInt(context.data.maxPipes) : 20;

    var server = net.createServer(async function(socket) {
      try{
        pipe_id = srs({length: 32, alphanumeric: true});
        socket.on('error', function(e) {
          try{
            console.log("TCP socket error");
            context.app.service('pipes').remove(pipe_id).catch((err) => {});
        }catch(e){};
        });
        socket.on('end', function(e) {
          try{
              console.log("TCP socket end");
              context.app.service('pipes').remove(pipe_id).catch((err) => {});
          }catch(e){};
        });

        socket.setTimeout(30000, function(e) {
          try{
              console.log("TCP socket timed out");
              context.app.service('pipes').remove(pipe_id).catch((err) => {});
          }catch(e){};
        });

        var pipes = await context.app.service("pipes").find({query:{tunnelId: data._id}});
        if(pipes.total >= data.maxPipes){
          console.log("Too many pipes on tunnel: " + data._id);
          socket.destroy();
        }else{
          context.app.pipe_list[pipe_id]={
            bufferSize : data.bufferSize,
            in: socket, 
            out: socket,
            canRead: true,
            canWrite: true
          };
          var jobOptions = data.jobOptions;
          jobOptions.pipe_id=pipe_id;
          context.app.service('pipes').create({
            tunnelId:data._id, 
            _id:pipe_id, 
            type: data.type,
            implantId: data.implantId,
            source: ":" + data.port.toString(),
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
    }
      }catch(e){console.log(e)};
    });
    
    server.on('listening',()=>{
      console.log("Created tcp server on: " + server._connectionKey.replace("4:",""));
    });

    server.on('error',(err)=>{
      server.error = err;
    });

    server.listen(parseInt(context.data.port), data.bindIP);

    function sleep(ms) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    }   

    // Dirty I know....
    await sleep(1000);

    if(server.error){
      throw server.error;
    }

    if(context.app.server_list == undefined){
      context.app.server_list = {};
    }

    context.app.server_list[data._id]=server;

    context.data = data;
  
    return context;
  };
};
