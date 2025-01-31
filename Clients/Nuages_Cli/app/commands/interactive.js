const { Command } = require('commander');


exports.interactive = new Command()
    .name('!interactive')
    .arguments('[program] [arguments]')
    .exitOverride()
    .description('Create an interactive channel on the implant')