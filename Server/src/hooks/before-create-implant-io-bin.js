// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

const { findByCapability } = require('./implant-capabilities');

module.exports = (options = {}) => {
  return async context => {
    if (!context || !context.data || typeof context.data !== 'object') {
      return context;
    }

    const pipeRecord = await findByCapability(
      context.app.service('pipes'),
      'implantCapabilityHash',
      context.params.route.pipeId
    );
    const pipeId = pipeRecord._id;

    if(context.app.pipe_list[pipeId] != undefined){
      var pipe = context.app.pipe_list[pipeId];
      if(pipe.canWrite){
        pipe.out.write(context.arguments[0]);
        if(context.arguments[0].length){
          context.app.pipe_list[pipeId].dataUp = pipe.dataUp + context.arguments[0].length;
          context.app.service('/implant/io').emit('pipedata', {pipe_id: pipeId, length: context.arguments[0].length});
        }
      }
      if(pipe.canRead){
        if(context.params.query.max){
          var bufferSize = Math.min(pipe.bufferSize,context.params.query.max);
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
          context.result = buff;
        }else{
          context.result = "";
        }
      }else{
        context.result = "";
      }
      
    }
    else{
      context.statusCode = 404;
      context.data = "";
    }
    return context;
  }
};
