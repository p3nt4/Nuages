const { Command } = require('commander');


exports.autoruns =  new Command()
.name('!autoruns')
.exitOverride()
.option('-r, --clear', 'Remove all autoruns')
.description('Manage autoruns')
.action(function (cmdObj) {
    if (cmdObj.clear) nuages.clearAutoruns();
    else nuages.getAutoruns();
})