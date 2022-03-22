// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

const { NotFound } = require('@feathersjs/errors');

module.exports = (options = {}) => {
  return async context => {
    if(context.app.pipe_list[context.data.pipe_id] != undefined){
      var pipe = context.app.pipe_list[context.data.pipe_id];
      if(pipe.canWrite){
        let buff = Buffer.from(context.data.in, 'base64');
        pipe.out.write(buff);
        if(context.data.in){
          context.service.emit('pipeData', {pipe_id: context.data.pipe_id, length: buff.length});
        }
      }
      if(pipe.canRead){
        if(context.data.maxSize){
          var bufferSize = Math.min(pipe.bufferSize, context.data.maxSize);
        }else{
          var bufferSize = pipe.bufferSize;
        }
        if(bufferSize ==0){
        }
        else if(pipe.in.readableLength>bufferSize){
          var buff = pipe.in.read(bufferSize);
        }else{
          var buff = pipe.in.read();
        }
        if(buff){
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
