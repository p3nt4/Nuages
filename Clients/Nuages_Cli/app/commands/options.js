const { Command } = require('commander');

exports.options = new Command()
    .name('!options')
    .description('Show options')
    .exitOverride()
    .option('-g, --global', 'Show global option')
    .action(function (cmdObj) {
        if(cmdObj.global){
            console.log(nuages.printOptions());
        }
        else if(nuages.vars.module){
            console.log(nuages.printModuleOptions());
        }
    });