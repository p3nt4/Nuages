// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

const {
  createCapability,
  findByCapability,
  hashCapability
} = require('./implant-capabilities');

module.exports = function (options = {}) {
  return async context => {
    if (!context || !context.data || typeof context.data !== 'object') {
      return context;
    }
    
    const implant = await findByCapability(
      context.app.service('implants'),
      'implantCapabilityHash',
      context.data.id
    );
    
    // Set the implant lastseen
    try {
      listener = context.params.headers.listener ? context.params.headers.listener: "";
      await context.app.service('implants').patch(implant._id, {lastSeen: Date.now(), listener: listener});
    }catch(e){
      throw(e);
    }

    // Get pending jobs for the implant
    const jobs = await context.app.service('jobs').find({query: {implantId: implant._id, jobStatus: 0}});
    
    context.result = {data:[]};

    const time = Date.now();

    // Update the job status to received
    for(var i=0; i<jobs.data.length; i++){
        if(jobs.data[i].timeout < time){
          await context.app.service('jobs').patch(jobs.data[i]._id, {jobStatus: 4, result: "Job timed out"})
        }else{
          const jobCapability = createCapability();
          await context.app.service('jobs').patch(jobs.data[i]._id, {
            jobStatus: 1,
            implantCapabilityHash: hashCapability(jobCapability)
          });
          var job = {
            _id : jobCapability,
            payload: jobs.data[i].payload
          };
          context.result.data.push(job);
        }
    }
    return context;
  };
};
