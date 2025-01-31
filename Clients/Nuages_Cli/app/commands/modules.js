const { Command } = require('commander');


exports.modules = new Command()
.name('!modules')
.arguments('[name]')
.exitOverride()
.description('Manage modules')
.option('-l, --load <path/all>', 'Load a module or all modules')
.option('-r, --remove', 'Remove the module')
.action(function (name, cmdObj) {
    if(!name){
        if(cmdObj.load){
            nuages.modloadService.create({modulePath:cmdObj.load}).catch((err) => {
            nuages.term.logError(err.message);
        });
        }else nuages.getModules();
    }else if(nuages.vars.modules[name] == undefined){
        nuages.term.logError("module not found");
    }
    else if(cmdObj.remove) {
        nuages.moduleService.remove(nuages.vars.modules[name.toLowerCase()]._id).catch((err) => {
            nuages.term.logError(err.message);
        });
    }
    else nuages.term.writeln("\r\n" + nuages.printModules({imp:nuages.vars.modules[name]}));
});
