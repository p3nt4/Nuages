// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

const srs = require('secure-random-string');

const error = require('@feathersjs/errors');

module.exports = function (options = {}) {
  return async context => {

    if(!context.data.options){

      throw new error.BadRequest("Options are required");

    }

     // Get the module this is related to:
     var mod = await context.app.service('modules').get(context.data.moduleId).catch((e) =>{
        throw new error.NotFound("Module not found");
     });
     
      // If this is an autorun, delete the implant option
      if(context.data.autorun === true){
        delete context.data.options.implant;
      }
      
     // Check if the options are filled 
     var options = Object.keys(mod.options);
     for(var i = 0; i < options.length; i++ ){
       if(options[i]=="implant" && context.data.autorun === true){}
       else if( mod.options[options[i]].required && (context.data.options[options[i]] === undefined || context.data.options[options[i]].value == "")){
         throw new error.BadRequest("Option is missing: "+ options[i]);
       }
     }
     
     // If this module requires an implant, verify it is compatible 
     if(context.data.options.implant && context.data.options.implant != "" && !(context.data.autorun === true)){
      var implant = await context.app.service('implants').get(context.data.options.implant.value).catch((e) =>{
        throw new error.NotFound("Implant not found");
      });  
        if(implant.os != "" && mod.supportedOS.indexOf(implant.os) == -1){
          throw new error.BadRequest("Implant OS not supported by this module");
        }
        for(var i = 0; i < mod.requiredPayloads.length; i++ ){
            if( implant.supportedPayloads.indexOf(mod.requiredPayloads[i]) == -1){
              throw new error.BadRequest("Implant does not support the payload: "+ mod.requiredPayloads[i]);
            }
        }
     }

    var data = {};

    data._id = srs({length: 32, alphanumeric: true});

    data.createdAt = Date.now();

    data.lastUpdated = data.createdAt;

    data.log = [];

    data.moduleName = mod.name;

    if(context.params.user !== undefined){
      data.creator = context.params.user.email;
    } else {data.creator = "autorun";}

    data.options = context.data.options;

    data.moduleId = context.data.moduleId;

    data.runStatus = 0;

    data.autorun = context.data.autorun

    context.data = data;

    return context;
  };
};
