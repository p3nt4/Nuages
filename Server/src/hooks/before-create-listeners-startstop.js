// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

const { NotFound, Forbidden} = require('@feathersjs/errors');


module.exports = (options = {}) => {
  return async context => {

    const runService = context.app.service('/listeners');

    const run = await runService.get(context.data.id);

    if(run === undefined){
      throw new NotFound("Handler run not found");
    }

    if(context.data.wantedStatus == run.runStatus && context.data.force != true){
      if(run.runStatus == 2){
        throw new Forbidden("Handler is already stopped");
      }
      else if(run.runStatus == 3){
        throw new Forbidden("Handler is already running");
      }
    }

    if(context.data.wantedStatus == 3 ){ // 3 is Running
      handlerFile = require("../../handlers/"+run.handlerName);

      handlerFile.run(context.app, run).catch((e) => {
        run.runStatus = 4; // 4 is Failed
        run.log.push({
          type: 1,
          message: e.message,
          time: Date.now()}
        );
          runService.patch(run._id, run);
          throw e
      });
  }

  if(context.data.wantedStatus == 2 ){ // 2 is Stopped
    handlerFile = require("../../handlers/"+run.handlerName);

    handlerFile.stop(context.app, run).catch((e) => {
      run.log.push({
        type: 1,
        message: e.message,
        time: Date.now()}
      );
        runService.patch(run._id, run);
        throw e
    });
}

    return context;
  };
};
