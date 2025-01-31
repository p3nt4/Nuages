const { Command } = require('commander');


exports.login = new Command()
.name("!login")
.exitOverride()
.arguments("<username>")
.description("Login to Nuages")
.action((username)=>{
    nuages.term.passwordMode = true;
    nuages.term.username = username;
});
