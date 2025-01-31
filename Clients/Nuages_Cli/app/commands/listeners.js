const { Command } = require('commander');


exports.listeners = new Command()
  .name("!listeners")
  .usage("[options] [id]")
  .exitOverride()
  .arguments("[id]")
  .description('Manage listeners')
  .option('-s, --start', 'Start the listener')
  .option('-p, --stop', 'Stop the listener')
  .option('-r, --remove', 'Remove the listener')
  .action(function (id, cmdObj) {
    if(!id){
        nuages.getListeners();
    }else if(nuages.vars.listeners[id] == undefined){
        nuages.term.logError("Listener not found");
    }
    else if(cmdObj.remove) {
        nuages.listenerService.remove(nuages.vars.listeners[id]._id).catch((err) => {
            nuages.term.logError(err.message);
        });
    }
    else if(cmdObj.start) {
        nuages.listenerStartService.create({id:nuages.vars.listeners[id]._id, wantedStatus: 3}).catch((err) => {
            nuages.term.logError(err.message);
        });
    }
    else if(cmdObj.stop) {
            nuages.listenerStartService.create({id:nuages.vars.listeners[id]._id, wantedStatus: 2}).catch((err) => {
                nuages.term.logError(err.message);
            });
    }
    else {
        nuages.term.writeln("\r\n" + nuages.printListeners({imp:nuages.vars.listeners[id]}));
        console.log(nuages.printModuleOptions("handler",nuages.vars.listeners[id].options));
    }
  })
