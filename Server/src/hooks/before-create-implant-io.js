// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

const { NotFound } = require('@feathersjs/errors');

module.exports = (options = {}) => {
  return async context => {
    if(context.app.pipe_list[context.data.pipe_id] != undefined){
      var pipe = context.app.pipe_list[context.data.pipe_id];
      if(pipe.canWrite){
        if(context.data.in){
          let buff = Buffer.from(context.data.in, 'base64');
          context.service.emit('pipeData', {pipe_id: context.data.pipe_id, length: buff.length});
          context.app.pipe_list[context.params.route.pipeId].dataUp = pipe.dataUp + buff.length;
          pipe.out.write(buff);
        }
        else{
          pipe.out.write(Buffer.from(""));
        }
      }
      if(pipe.canRead){
        if(context.data.maxSize){
          var bufferSize = Math.min(pipe.bufferSize, context.data.maxSize);
        }else{
          var bufferSize = pipe.bufferSize;
        }
        if(bufferSize == 0){
        }
        else if(pipe.in.readableLength>bufferSize){
          var buff = pipe.in.read(bufferSize);
        }else{
          var buff = pipe.in.read();
        }
        if(buff){
          context.app.pipe_list[context.params.route.pipeId].dataDown = pipe.dataDown + buff.length;
          context.result = {out:buff.toString('base64')};
        }else{
          context.result = {out:""};
        }
      }else{
        context.result = {};
      }
      
    }
    else{
      context.statusCode = 404;
      context.data = "";
    }
    return context;
  }
};
