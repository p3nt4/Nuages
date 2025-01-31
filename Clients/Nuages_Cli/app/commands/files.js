const { Command } = require('commander');


exports.files = new Command()
    .name('!files')
    .arguments('[id]')
    .exitOverride()
    .description('Manage files')
    .option('-r, --remove', 'Remove file')
    .option('-s, --save <path>', 'Download the file to the local client')
    .option('-u, --upload <path>', 'Upload a file from the local client')
    .action(function (id, cmdObj) {
        if(!id){
            if (cmdObj.upload) nuages.uploadFile(cmdObj.upload);
            else nuages.getFiles();
            return;
        }
        else file = nuages.findFile(id);
        if(!file){
            return;
        }else if(cmdObj.remove) {
            nuages.fileService.remove(file._id).catch((err) => {
                nuages.term.logError(err.message);
            });
        }
        else if(cmdObj.save) {
            nuages.downloadFile(file, cmdObj.save);
        }
        else{
            nuages.term.writeln("\r\n" + nuages.printFiles({imp:file}));
        }
    })
