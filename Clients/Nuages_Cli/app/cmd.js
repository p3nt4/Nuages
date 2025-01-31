const term = require("./term").term;
nuages = require("./nuagesAPI").nuages
const { Command } = require('commander');


nuages.commands = {};

nuages.maincommand = new Command();
nuages.maincommand.name(" ")
nuages.maincommand.usage("[command] [options]")
nuages.maincommand.exitOverride();

nuages.commands["!back"] = new Command()
.name("!back")
.exitOverride()
.description('Exit implant, module and handler')
.action(function () {
    nuages.vars.globalOptions.implant.value= ""; 
    nuages.vars.module = ""; 
});

nuages.commands["!exit"] = new Command()
.name("!exit")
.exitOverride()
.alias('!quit')
.description('Exit the program')
.action(function () {
    process.exit(0);
});


nuages.commands["!login"] = require("./commands/login").login;
nuages.commands["!implants"] = require("./commands/implants").implants;
nuages.commands["!implant"] = require("./commands/implants").implant;
nuages.commands["!shell"] = require("./commands/shell").shell;
nuages.commands["!interactive"] = require("./commands/interactive").interactive;
nuages.commands["!config"] = require("./commands/config").config;
nuages.commands["!put"] = require("./commands/put").put;    
nuages.commands["!get"] = require("./commands/get").get; 
nuages.commands["!files"] = require("./commands/files").files;   
nuages.commands["!options"] = require("./commands/options").options;   
nuages.commands["!set"] = require("./commands/set").set; 
nuages.commands["!unset"] = require("./commands/set").unset; 
nuages.commands["!use"] = require("./commands/use").use; 
nuages.commands["!modules"] = require("./commands/modules").modules; 
nuages.commands["!run"] = require("./commands/run").run; 
nuages.commands["!autoruns"] = require("./commands/autoruns").autoruns; 
nuages.commands["!handlers"] = require("./commands/handlers").handlers; 
nuages.commands["!listeners"] = require("./commands/listeners").listeners; 
nuages.commands["!jobs"] = require("./commands/jobs").jobs; 
nuages.commands["!tunnels"] = require("./commands/tunnels").tunnels;
nuages.commands["!channels"] =  require("./commands/channels").channels;
nuages.commands["!webhooks"] =  require("./commands/webhooks").webhooks;
    
nuages.maincommand.addCommand(nuages.commands["!login"]);
nuages.maincommand.addCommand(nuages.commands["!implants"]);
nuages.maincommand.addCommand(nuages.commands["!shell"]);
nuages.maincommand.addCommand(nuages.commands["!interactive"]);
nuages.maincommand.addCommand(nuages.commands["!config"]);
nuages.maincommand.addCommand(nuages.commands["!put"]);
nuages.maincommand.addCommand(nuages.commands["!get"]);
nuages.maincommand.addCommand(nuages.commands["!files"]);
nuages.maincommand.addCommand(nuages.commands["!use"]);
nuages.maincommand.addCommand(nuages.commands["!modules"]);
nuages.maincommand.addCommand(nuages.commands["!run"]);
nuages.maincommand.addCommand(nuages.commands["!autoruns"]);
nuages.maincommand.addCommand(nuages.commands["!handlers"]);
nuages.maincommand.addCommand(nuages.commands["!listeners"]);
nuages.maincommand.addCommand(nuages.commands["!jobs"]);
nuages.maincommand.addCommand(nuages.commands["!tunnels"]);
nuages.maincommand.addCommand(nuages.commands["!channels"]);
nuages.maincommand.addCommand(nuages.commands["!options"]);
nuages.maincommand.addCommand(nuages.commands["!set"]);
nuages.maincommand.addCommand(nuages.commands["!unset"]);
nuages.maincommand.addCommand(nuages.commands["!webhooks"]);
nuages.maincommand.addCommand(nuages.commands["!back"]);
nuages.maincommand.addCommand(nuages.commands["!exit"]);

    nuages.maincommand.addHelpCommand('!help [command]', 'Show help for a command');
    
    nuages.resetmaincommand = function(){
        nuages.commands["!implants"].configure = undefined; 
        nuages.commands["!implants"].value = undefined;
        nuages.commands["!implants"].kill = undefined;
        nuages.commands["!implants"].remove = undefined;
        nuages.commands["!implants"].interact = undefined;
        nuages.commands["!implants"].all = undefined;
        nuages.commands["!config"].key = undefined;
        nuages.commands["!config"].value = undefined;
        nuages.commands["!put"].local = undefined;
        nuages.commands["!get"].local = undefined;
        nuages.commands["!run"].autorun = undefined;
        nuages.commands["!options"].global = undefined; 
        nuages.commands["!set"].global = undefined;
        nuages.commands["!unset"].global = undefined; 
        nuages.commands["!handlers"].remove = undefined; 
        nuages.commands["!autoruns"].clear = undefined; 
        nuages.commands["!modules"].remove = undefined; 
        nuages.commands["!listeners"].remove = undefined;
        nuages.commands["!listeners"].start = undefined;
        nuages.commands["!listeners"].stop = undefined; 
        nuages.commands["!jobs"].command = undefined; 
        nuages.commands["!jobs"].implant = undefined; 
        nuages.commands["!jobs"].type = undefined; 
        nuages.commands["!jobs"].max = undefined; 
        nuages.commands["!jobs"].save = undefined; 
        nuages.commands["!jobs"].kill = undefined; 
        nuages.commands["!files"].remove = undefined;
        nuages.commands["!files"].upload = undefined;  
        nuages.commands["!files"].save = undefined;
        nuages.commands["!tunnels"].remove = undefined; 
        nuages.commands["!tunnels"].socks = undefined;
        nuages.commands["!tunnels"].tcp = undefined; 
        nuages.commands["!tunnels"].reverse = undefined; 
        nuages.commands["!tunnels"].listen = undefined;
        nuages.commands["!tunnels"].destination = undefined;
        nuages.commands["!tunnels"].channels = undefined;
        nuages.commands["!tunnels"].timeout = undefined;
        nuages.commands["!channels"].remove = undefined; 
        nuages.commands["!channels"].interact = undefined; 
        nuages.commands["!channels"].all = undefined;
        nuages.commands["!webhooks"].mattermost = undefined;
        nuages.commands["!webhooks"].custom = undefined; 
        nuages.commands["!webhooks"].remove = undefined; 
        nuages.commands["!webhooks"].ignoreCertErrors = undefined; 

}

function CommandParser(str) {
    var args = [];
    var readingPart = false;
    var quoteStyle = false;
    var part = '';
    for(var i=0; i<str.length;i++){
        if(str.charAt(i) === ' ' && !readingPart) {
            if(part != ''){
                args.push(part);
            }
            part = '';
        } else {
            if(str.charAt(i) === '\\' && (i > 1 && str.charAt(i-1) !== '\\') && quoteStyle != false){
            }
            else if( str.charAt(i) === quoteStyle && str.charAt(i-1) != '\\'){
                readingPart = !readingPart;
                quoteStyle = false;
            }
            else if((str.charAt(i) === '\"' || str.charAt(i) === '\'') && !readingPart) {
                readingPart = !readingPart;
                quoteStyle = str.charAt(i);
            } else {
                part += str.charAt(i);
            }
        }
    }
    args.push(part);
    return args;
}

executeCommand = function(cmd){
    if(nuages.term.passwordMode){
        nuages.login(nuages.term.username,cmd);
        cmd = "";
        nuages.term.history = nuages.term.history.slice(1);
        nuages.term.passwordMode = false;
        return;
    }
    cmdArray = CommandParser(cmd, true);
    cmdArray = cmdArray.filter(function(element) {
        return element !== "";
    });
    if(cmdArray.length == 0){
        return;
    }
    if (cmdArray[0].toLowerCase() == "cd"){
        if(!nuages.vars.implants[nuages.vars.globalOptions.implant.value.substring(0.6)]){
            return;
        }
        else if(nuages.vars.implants[nuages.vars.globalOptions.implant.value.substring(0.6)].supportedPayloads.includes("cd")){
            nuages.createJob(nuages.vars.globalOptions.implant.value, {type:"cd", options:{ path: nuages.vars.paths[nuages.vars.globalOptions.implant.value.substring(0.6)], dir:cmdArray.slice(1).join(" ")}});
        }
        else{
            nuages.createJob(nuages.vars.globalOptions.implant.value, {type:"command", options:{ path: nuages.vars.paths[nuages.vars.globalOptions.implant.value.substring(0.6)], cmd: "cmd /C \"FOR /F %i IN (\"\""+cmdArray.slice(1).join(" ")+"\"\") DO IF EXIST %~fi (echo %~fi)\"", cd:true}});
        }   
    }
    else if (cmdArray[0].toLowerCase() == "!interactive"){
        if(cmdArray.length == 1){
            implant = nuages.vars.implants[nuages.vars.globalOptions.implant.value.substring(0,6)]
            filename = (implant.os.toLowerCase() == "windows") ? "cmd.exe": "bash";
            args = (implant.os.toLowerCase() == "windows") ? "" : "-i";
        }else if(cmdArray.length > 2){
            filename = cmdArray[1];
            args = cmdArray.slice(2, cmdArray.length).join(" ");
        }else{
            filename = cmdArray[1];
            args = "";
        }
        nuages.createImplantInteractiveChannel(nuages.vars.globalOptions.implant.value, filename, args);
    }
    else if (cmd[0] == "!"){
        if(cmdArray[0].toLowerCase() == "!implant"){
            cmdArray.splice(1, 0, nuages.vars.globalOptions.implant.value);
            cmdArray[0]="!implants";
        }
       nuages.resetmaincommand();
       cmdArray[0] = cmdArray[0].toLowerCase();
       nuages.maincommand.parse(cmdArray, { from: 'user' });
    }
    else if(cmdArray[0].length > 0){
        if(nuages.vars.globalOptions.implant.value == "" || nuages.vars.globalOptions.implant.value == undefined) {return;}
        nuages.createJob(nuages.vars.globalOptions.implant.value, {type:"command", options:{ path: nuages.vars.paths[nuages.vars.globalOptions.implant.value.substring(0.6)], cmd: cmd}});
    }
    return;
}

exports.execute = executeCommand;
