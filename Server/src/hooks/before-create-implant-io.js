// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

const { findByCapability } = require('./implant-capabilities');

module.exports = (options = {}) => {
  return async context => {
    const pipeRecord = await findByCapability(
      context.app.service('pipes'),
      'implantCapabilityHash',
      context.data.pipe_id
    );
    const pipeId = pipeRecord._id;

    if(context.app.pipe_list[pipeId] != undefined){
      var pipe = context.app.pipe_list[pipeId];
      if(pipe.canWrite){
        if(context.data.in){
          let buff = Buffer.from(context.data.in, 'base64');
          context.service.emit('pipedata', {pipe_id: pipeId, length: buff.length});
          context.app.pipe_list[pipeId].dataUp = pipe.dataUp + buff.length;
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
          context.app.pipe_list[pipeId].dataDown = pipe.dataDown + buff.length;
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
