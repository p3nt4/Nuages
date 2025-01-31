const { Command } = require('commander');


exports.run = new Command()
    .name('!run')
    .exitOverride()
    .description('Run the module or handler')
    .option('-a, --autorun', 'Autorun the module on new implants')
    .action(function (cmdObj) {
        if(nuages.vars.moduletype=="module"){
            if(nuages.vars.modules[nuages.vars.module]){
                if(cmdObj.autorun){
                    nuages.modrunService.create({moduleId: nuages.vars.modules[nuages.vars.module]._id, options: nuages.vars.moduleOptions, autorun: true}).then(items => {nuages.getAutoruns()}).catch((err) => {
                        nuages.term.logError(err.message);
                    });
                }
                else{
                    nuages.modrunService.create({moduleId: nuages.vars.modules[nuages.vars.module]._id, options: nuages.vars.moduleOptions, autorun: false}).catch((err) => {
                        nuages.term.logError(err.message);
                    });
                }
            }
            else{
                nuages.term.logError("Module not set");
            }
        }
        else if(nuages.vars.moduletype=="handler"){
            if(nuages.vars.handlers[nuages.vars.module]){
                nuages.listenerService.create({handlerId: nuages.vars.handlers[nuages.vars.module]._id, options: nuages.vars.moduleOptions}).then((run)=>{
                    nuages.listenerStartService.create({id:run._id, wantedStatus: 3}).catch((err) => {
                        nuages.term.logError(err.message);
                    });

                }).catch((err) => {
                        nuages.term.logError(err.message);
                    });
                }else{
                    nuages.term.logError("Handler not set");
                }
            }
        else{
            nuages.term.logError("You have nothing to run!");
        }
    });