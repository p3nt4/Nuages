const { Command } = require('commander');


exports.shell = new Command()
    .name('!shell')
    .arguments('<id>')
    .exitOverride()
    .description('Interact with implant')
    .action(function (id) {
        nuages.interactWithImplant(id);
    });