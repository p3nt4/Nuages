const { Command } = require('commander');


exports.use = new Command()
    .name('!use')
    .arguments('<name>')
    .exitOverride()
    .description('Select a module or handler')
    .action(function (name) {
        if (nuages.vars.modules[name.toLowerCase()] !== undefined){
            nuages.vars.module = name.toLowerCase();
            nuages.vars.moduleOptions = nuages.vars.modules[name.toLowerCase()].options;
            if(nuages.vars.moduleOptions.implant && nuages.vars.implants[nuages.vars.globalOptions.implant.value]){
                nuages.vars.moduleOptions.implant.value = nuages.vars.implants[nuages.vars.globalOptions.implant.value]._id;
            }
            nuages.vars.moduletype = "module";
        }else if(nuages.vars.handlers[name.toLowerCase()] !== undefined){
            nuages.vars.module = name.toLowerCase();
            nuages.vars.moduleOptions = nuages.vars.handlers[name.toLowerCase()].options;
            nuages.vars.moduletype = "handler";
        }
        else{
            nuages.term.logError("Module/Handler not found, did you load it?");
        }
    });

