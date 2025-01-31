const { Command } = require('commander');


exports.channels = new Command()
    .name("!channels")
    .arguments('[id]')
    .exitOverride()
    .description('Manage channels')
    .option('-r, --remove', 'Remove channel')
    .option('-i, --interact', 'Interact with the channel')
    .option('--all', 'Apply the command to all implants')
    .action(function (id, cmdObj) {
        if(!id && !cmdObj.all){
            nuages.getPipes();
        }else if(!cmdObj.all && nuages.vars.pipes[id] == undefined){
            nuages.term.logError("Channel not found");
        }else if(cmdObj.remove) {
            if(cmdObj.all){
                nuages.pipeService.find({$limit:1000}).then(pipes => {
                    for(var i=0; i< pipes.data.length; i++){
                        nuages.pipeService.remove(pipes.data[i]._id);
                    }
                }).catch(err=>{
                    nuages.term.logError(err);
                });
            }else{
            nuages.pipeService.remove(nuages.vars.pipes[id]._id).catch((err) => {
                nuages.term.logError(err.message);
            });
        }
        }
        else if(cmdObj.interact) {
            nuages.interactWithPipe(nuages.vars.pipes[id]._id, process.stdin, process.stdout);
        }
        else{
            nuages.term.writeln("\r\n" + nuages.printPipes({imp:nuages.vars.pipes[id]}));
        }
    });
