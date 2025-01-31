const { Command } = require('commander');


exports.get = nuages.commands["!get"] = new Command()
.name('!get')
.arguments('<path> [localpath]')
.option('-l, --local', 'Downloads the file to the local client')
.usage('<path> | !get --local <path> <localpath>')
.exitOverride()
.description('Start an upload job on the current implant')
.action(function (path, localpath, cmdObj) {
    if(cmdObj.local){
        if (localpath == undefined){
            nuages.term.logError("A local path is needed");
            return;
        }
        nuages.getLocal(path, localpath, nuages.vars.globalOptions.implant.value);
        return;
    }
    var arr = path.split("\\");
    var filename = arr[arr.length-1];
    arr = filename.split("/");
    filename = arr[arr.length-1];
    nuages.createJobWithPipe(nuages.vars.globalOptions.implant.value, 
        {type:"upload", 
            options:{ 
                file: path, 
                path: nuages.vars.paths[nuages.vars.globalOptions.implant.value.substring(0.6)]
            }
        }, 
        {type: "upload",
            source: path,
            implantId: nuages.vars.globalOptions.implant.value,
            filename: filename
        }).catch((err) => {
            nuages.term.logError(err.message);
        });;
});