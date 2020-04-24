// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

const error = require('@feathersjs/errors');

module.exports = function (options = {}) {
  return async context => {
    
    // The implant must know its id
    if(!context.data.id || context.data.id.length != 32){
		  throw new error.Forbidden("Unauthorized");
    }
    
    // Set the implant lastseen
    try {
      listener = context.params.headers.listener ? context.params.headers.listener: "";
      await context.app.service('implants').patch(context.data.id, {lastSeen: Date.now(), listener: listener});
    }catch(e){
      throw(e);
    }

    // Get pending jobs for the implant
    const jobs = await context.app.service('jobs').find({query: {implantId: context.data.id, jobStatus: 0}});
    
    context.result = {data:[]};

    const time = Date.now();

    // Update the job status to received
    for(var i=0; i<jobs.data.length; i++){
        if(jobs.data[i].timeout < time){
          context.app.service('jobs').patch(jobs.data[i]._id, {jobStatus: 4, result: "Job timed out"})
        }else{
          context.app.service('jobs').patch(jobs.data[i]._id, {jobStatus: 1});
          delete jobs.data[i].creator;
          delete jobs.data[i].vars;
          delete jobs.data[i].fileId;
          context.result.data.push(jobs.data[i]);
        }
    }
    return context;
  };
};
