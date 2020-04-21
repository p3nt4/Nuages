// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
const { Forbidden} = require('@feathersjs/errors');

const srs = require('secure-random-string');

var MemoryStream = require('memorystream');

module.exports = (options = {}) => {
  return async context => {
    if(context.params.user != undefined){
      var data = {};

      data.id = srs({length: 32, alphanumeric: true});

      data._id = data.id;

      data.implantId = context.data.implantId;

      data.type = context.data.type ? context.data.type : "";

      data.destination = context.data.destination ? context.data.destination : "";

      data.bufferSize = parseInt(context.data.bufferSize) ? parseInt(context.data.bufferSize) : 4096;

      if(context.app.pipe_list == undefined){
        context.app.pipe_list = {};
      }
      context.app.pipe_list[data._id]={
        bufferSize : data.bufferSize,
        in: new MemoryStream(), 
        out: new MemoryStream()
      };

    context.data = data;

    }else{

      context.data.id = context.data._id ? context.data._id : srs({length: 32, alphanumeric: true});

      context.data._id = context.data.id;
    }
    return context;
  };
};
