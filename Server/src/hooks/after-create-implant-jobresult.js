// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
const error = require('@feathersjs/errors');

module.exports = function (options = {}) {
  return async context => {

    // Get the job this is related to:
    var job = await context.app.service('jobs').get(context.data.jobId);

    if (job === undefined){
      throw new  error.NotFound("Job not found");
    }

    if (job.jobStatus > 2){
      throw new  error.Forbidden("Job already completed");
    }

    // Special treatment for upload jobs
    if (job.payload.type == "Upload" && context.data.error != true){
      const n = context.data.n ? context.data.n : 0;
      var file = await context.app.service('/fs/files').get(job.payload.options.file_id);
      if (file === undefined){
          throw error.NotFound("File not found");
       }
      context.app.service("/fs/chunks").create({files_id: job.payload.options.file_id, n: parseInt(n), data: context.data.data})
      if(!context.data.moreData){
        context.app.service("/fs").patch(job.payload.options.file_id,{path: context.data.result, uploadedBy: job.implantId});	
      }
      else{
        context.app.service("/fs").patch(job.payload.options.file_id,{path: context.data.result, uploadedBy: job.implantId, lastChunk: n});	
        }
    }
    
	  // Append the result
	  job.result += context.data.result;

    // Status 2 = Error
    if(context.data.error){
      job.jobStatus = 4;
    }

    // Status 2 = More data incomming
    else if(context.data.moreData){
        job.jobStatus = 2;
    }    

    // Status 3 = Completed
    else{
        job.jobStatus = 3;
    }
    
    job.lastUpdated = Date.now();

    //Update the job with the new data
    context.app.service('jobs').patch(job._id, job); 

    context.result = {};

    return context;
  };
};
