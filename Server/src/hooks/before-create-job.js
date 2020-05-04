// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
const srs = require('secure-random-string');

const error = require('@feathersjs/errors');

module.exports = function (options = {}) {
  return async context => {
    
    var data = {};

    //  Data validation
    data._id = srs({length: 32, alphanumeric: true});

    data.createdAt = Date.now();

    data.lastUpdated = data.createdAt;

    data.jobStatus = 0;

    data.result = "";

    data.vars = context.data.vars ? context.data.vars : {}; // An object to put any variables wanted, that will not be shared with the implant

    data.creator = context.params.user ? context.params.user.email : "";

    data.timeout = context.data.timeout ? parseInt(context.data.timeout) : 9555520390191;

    data.fileUpload = context.data.fileUpload ? context.data.fileUpload  : false;

    data.moduleRun = context.data.moduleRun ? context.data.moduleRun : undefined;

    data.pipe_id = context.data.pipe_id ? context.data.pipe_id : undefined;

    data.noPipeDelete = context.data.noPipeDelete ? context.data.noPipeDelete : false;

    if(!context.data.payload){
      throw error.BadRequest("A payload is needed");
    } else{
      data.payload = context.data.payload;
    }

    if(!context.data.implantId){
      throw error.BadRequest("An implant ID is needed");
    }else{
      data.implantId = context.data.implantId;
    }

    
    if(context.data.pipe){
      pipe = await context.app.service('pipes').create(context.data.pipe).catch((err)=>{console.log(err)});
      data.pipe_id = pipe._id;
      data.payload.options.pipe_id = pipe._id;
    }

    context.data = data;

    return context;
  };
};
