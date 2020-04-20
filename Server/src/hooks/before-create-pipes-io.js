// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

const { NotFound} = require('@feathersjs/errors');

module.exports = (options = {}) => {
  return async context => {

    if(context.app.pipe_list != undefined && context.app.pipe_list[context.data.pipe_id] != undefined){
      var pipe = context.app.pipe_list[context.data.pipe_id];
      if(context.data.in){
        let buff = Buffer.from(context.data.in, 'base64');
        pipe.out.write(buff);
      }
      if(pipe.in.readableLength>pipe.bufferSize){
        var buff = pipe.in.read(pipe.bufferSize);
      }else{
        var buff = pipe.in.read();
      }
      if(buff){
        context.result = {out:buff.toString('base64')};
      }else{
        context.result = {out:""};
      }
    }else{
      throw new NotFound("Pipe not found");
    }
    return context;
  };
};
