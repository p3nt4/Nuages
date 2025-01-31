const { Command } = require('commander');


exports.config = new Command()
    .name('!config')
    .arguments('[key] [value]')
    .exitOverride()
    .description('View or change implant configuration')
    .action(function (key, value, cmdObj) {
        var tmpconfig = {};
        if(key !== undefined && value !== undefined){
            tmpconfig[key] = value
        }
        nuages.createJob(nuages.vars.globalOptions.implant.value, {type: "configure", options: {config:tmpconfig}}); 
    });