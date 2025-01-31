const { Command } = require('commander');


exports.put = new Command()
    .name('!put')
    .arguments('<id> [path]')
    .usage('<id> [path] | !put --local <localpath> [path]')
    .exitOverride()
    .description('Start a download job on the current implant')
    .option('-l, --local', 'Send a file from the local client')
    .action(function (id, path, cmdObj) {
        if(cmdObj.local) {nuages.putLocal(id, path,nuages.vars.globalOptions.implant.value); return}
        file = nuages.findFile(id);
        if(file == undefined) return;
        var target = path ? path : file.filename;
        nuages.createJobWithPipe(nuages.vars.globalOptions.implant.value, 
            {type:"download", 
                options:{ 
                    file: target, 
                    filename: file.filename, 
                    length: file.length, 
                    path: nuages.vars.paths[nuages.vars.globalOptions.implant.value.substring(0.6)]
                }, 
            },
            {type: "download",
                source: file._id,
                destination: target,
                implantId: nuages.vars.globalOptions.implant.value
            }).catch((err) => {
                nuages.term.logError(err.message);
            });
    });