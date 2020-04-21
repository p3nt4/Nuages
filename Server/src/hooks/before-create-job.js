// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
const srs = require('secure-random-string');

const error = require('@feathersjs/errors');

module.exports = function (options = {}) {
  return async context => {
    
    var data2 = {};

    //  Data validation
    data2._id = srs({length: 32, alphanumeric: true});

    data2.createdAt = Date.now();

    data2.lastUpdated = data2.createdAt;

    data2.jobStatus = 0;

    data2.result = "";

    data2.vars = context.data.vars ? context.data.vars : {}; // An object to put any variables wanted, that will not be shared with the implant

    data2.creator = context.params.user ? context.params.user.email : "";

    data2.timeout = context.data.timeout ? parseInt(context.data.timeout) : 9555520390191;

    data2.fileUpload = context.data.fileUpload ? context.data.fileUpload  : false;

    data2.moduleRun = context.data.moduleRun ? context.data.moduleRun : undefined;

    data2.pipe_id = context.data.pipe_id ? context.data.pipe_id : undefined;

    if(!context.data.payload){
      throw error.BadRequest("A payload is needed");
    } else{
      data2.payload = context.data.payload;
    }

    if(!context.data.implantId){
      throw error.BadRequest("An implant ID is needed");
    }else{
      data2.implantId = context.data.implantId;
    }

    // If the result of the job is meant to create a file in the db
    if (data2.fileUpload === true){
      if(!context.data.fileName){
        throw error.BadRequest("A filename is required for file upload jobs");
      }
      if(!context.data.chunkSize){
        throw error.BadRequest("A chunk size is required for file upload jobs");
      }
      const file = await context.app.service('/fs/files').create({filename: context.data.fileName, chunkSize: parseInt(context.data.chunksize), length: 0, metadata:{ uploadedBy: data2.implantId }});
      
      data2.fileId = file._id;
    }

    context.data = data2;

    return context;
  };
};
