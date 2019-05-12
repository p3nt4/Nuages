// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
module.exports = function (options = {}) {
  return async context => {

    // If the job is completed
    if(context.result.jobStatus > 2){
      
      // If this job is part of a module run
      if(context.result.moduleRun && context.result.moduleRun.runId && context.result.moduleRun.callback){

        context.app.service("/modules/run").get(context.result.moduleRun.runId).then((moduleRun)=>{

          moduleFile = require("../../modules/"+moduleRun.moduleName);

          moduleFile[context.result.moduleRun.callback](context.app,moduleRun,context.result);

        }).catch((e) => {

          console.log(e);

          moduleRun.runStatus = 4;

          moduleRun.log.push({
            type: 1,
            message: e.message,
            time: Date.now()}
          );

          context.app.service("/modules/run").patch(moduleRun._id, moduleRun);
      });
      }
    }

    return context;
  };
};
