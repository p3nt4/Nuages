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
    //if (job.fileUpload === true && context.data.error != true){
    //  const n = context.data.n ? context.data.n : 0;
    //  var file = await context.app.service('/fs/files').get(job.fileId);
    //  if (file === undefined){
    //     throw error.NotFound("File not found");
    //   }
    //  await context.app.service("/fs/chunks").create({files_id: file._id, n: parseInt(n), data: context.data.data});
     // if(!context.data.moreData){
    //    context.app.service("/fs").patch(file._id,{path: context.data.result, uploadedBy: job.implantId});	
    //  }
    //  else{
    //    context.app.service("/fs").patch(file._id,{path: context.data.result, uploadedBy: job.implantId, lastChunk: n});	
    //    }
    //}


	  // Append the result
	  job.result += context.data.result;

    // Status 4 = Error
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

    //Delete pipe if this job had a pipe
    if(job.pipe_id && job.jobStatus > 2 && !(job.noPipeDelete && job.jobStatus == 3) && context.app.pipe_list[job.pipe_id]){
      context.app.service("pipes").remove(job.pipe_id);	
    }

    //Update the job with the new data
    context.app.service('jobs').patch(job._id, job); 

    context.result = {};

    return context;
  };
};
