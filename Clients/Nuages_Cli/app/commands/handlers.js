const { Command } = require('commander');


exports.handlers = new Command()
    .name('!handlers')
    .arguments('[name]')
    .description('Manage handlers')
    .exitOverride()
    .option('-l, --load <path/name>', 'Load a handler or all handlers')
    .option('-r, --remove', 'Remove the handler')
    .action(function (name, cmdObj) {
    if(!name){
        if(cmdObj.load){
            nuages.handloadService.create({handlerPath:cmdObj.load}).catch((err) => {
                nuages.term.logError(err.message);
            });
        }
        else nuages.getHandlers();
    }else if(nuages.vars.handlers[name] == undefined){
        nuages.term.logError("Handler not found");
    }
    else if(cmdObj.remove) {
        nuages.handlerService.remove(nuages.vars.handlers[name.toLowerCase()]._id).catch((err) => {
            nuages.term.logError(err.message);
        });
    }
    else nuages.term.writeln("\r\n" + nuages.printHandlers({imp:nuages.vars.handlers[name]}));
    })