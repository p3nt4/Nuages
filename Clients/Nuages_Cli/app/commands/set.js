const { Command } = require('commander');


exports.set = nuages.commands["!set"]= new Command()
    .name('!set')
    .arguments('<key> <value>')
    .description('Set an option')
    .exitOverride()
    .option('-g, --global', 'Set a global option')
    .action(function (key, value, cmdObj) {
        var target = cmdObj.global ? nuages.vars.globalOptions : nuages.vars.moduleOptions;
        if(target[key.toLowerCase()] !== undefined){
            if(key.toLowerCase() == "implant"){
                if(nuages.vars.implants[value]){
                    target["implant"].value = nuages.vars.implants[value]._id;
                }else{
                    nuages.term.logError("Implant not found");
                }
            }else if(key.toLowerCase() == "file"){
                if(nuages.vars.files[value]){
                    target["file"].value = nuages.vars.files[value]._id;
                }else{
                    nuages.term.logError("File not found");
                }
            }
            else{
                target[key.toLowerCase()].value = value;
            }
        }else{
            target[key.toLowerCase()] = {value: value, required: false};
        }     
    });

exports.unset = nuages.commands["!unset"]= new Command()
    .name('!unset')
    .arguments('<key>')
    .exitOverride()
    .description('Unset an option')
    .option('-g, --global', 'Unset a global option')
    .action(function (key, cmdObj) {
        var target = cmdObj.global ? nuages.vars.globalOptions : nuages.vars.moduleOptions;
        if(target[key.toLowerCase()] !== undefined){
            target[key.toLowerCase()].value = "";
        }
    });
