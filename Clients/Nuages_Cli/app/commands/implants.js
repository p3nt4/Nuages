const { Command } = require('commander');

exports.implants = new Command()
  .name('!implants')
  .arguments('[id]')
  .exitOverride()
  .description('Manage implants')
  .option('-i, --interact', 'Start interacting with the implant')
  .option('-r, --remove', 'Remove the implant')
  .option('-c, --configure [key]', 'Show or modify the implant configuration')
  .option('-v, --value [value]', 'New configuration value')
  .option('-k, --kill', 'Kill the implant')
  .option('--all', 'Apply the command to all implants')
  .action(function (id, cmdObj) {
    if(!id && !cmdObj.all){
        nuages.getImplants();
    }else if(nuages.vars.implants[id] == undefined && !cmdObj.all){
        nuages.term.logError("Implant not found");
    }
    else if(cmdObj.interact) nuages.interactWithImplant(id);
    else if(cmdObj.remove) {
        if(cmdObj.all) nuages.implantService.remove(null, {});
        else nuages.implantService.remove(nuages.vars.implants[id]._id);  
    }
    else if(cmdObj.kill) {
        if(cmdObj.all) {
            nuages.implantService.find({query: {$limit: 200}}).then(implants => {
                for(var i=0; i< implants.data.length; i++){
                    shortID = implants.data[i]._id.substring(0,6);
                    nuages.createJob(shortID, {type: "exit", options: {}});
                }
            }).catch(err=>{
                nuages.term.logError(err);
            });
        }
        else nuages.createJob(id, {type: "exit", options: {}});
    }
    else if(cmdObj.configure){
        var tmpconfig = {};
        if(cmdObj.value){
            tmpconfig[cmdObj.configure] = cmdObj.value
        }
        if(cmdObj.all) {
            nuages.implantService.find({query: {$limit: 200}}).then(implants => {
                for(var i=0; i< implants.data.length; i++){
                    shortID = implants.data[i]._id.substring(0,6);
                    nuages.createJob(shortID, {type: "configure", options: {config:tmpconfig}});
                }
            }).catch(err=>{
                nuages.term.logError(err);
            });
        }
        else nuages.createJob(id, {type: "configure", options: {config:tmpconfig}}); 
    }
    else nuages.term.writeln("\r\n" + nuages.printImplants({imp:nuages.vars.implants[id]}));
  })

  exports.implant = nuages.commands["!implant"] = new Command()
    .name('!implant')
    .arguments('[options]')
    .exitOverride()
    .description("Apply the !implants command to the current implant");