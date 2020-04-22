// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
module.exports = (options = {}) => {
  return async context => {
    const run = await context.app.service("/listeners").get(context.id);
    if(run.runStatus == 3){
      await context.app.service("/listeners/startstop").create({id:context.id, wantedStatus:2});
    }
    return context;
  };
};
