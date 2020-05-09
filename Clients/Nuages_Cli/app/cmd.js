const term = require("./term").term;
nuages = require("./nuagesAPI").nuages
const { Command } = require('commander');


nuages.commands = {};

nuages.maincommand = new Command();
nuages.maincommand.name(" ")
nuages.maincommand.usage("[command] [options]")
nuages.maincommand.exitOverride();


nuages.commands["!login"]= new Command()
.name("!login")
.exitOverride()
.arguments("<username>")
.description("Login to Nuages")
.action((username)=>{
    nuages.term.passwordMode = true;
    nuages.term.username = username;
});


nuages.commands["!implants"]= new Command()
  .name('!implants')
  .arguments('[id]')
  .exitOverride()
  .description('Manage implants')
  .option('-i, --interact', 'Start interacting with the implant')
  .option('-r, --remove', 'Remove the implant')
  .option('-c, --configure [key]', 'Show or modify the implant configuration')
  .option('-v, --value [value]', 'New configuration value')
  .option('-k, --kill', 'Remove the implant')
  .option('--all', 'Apply the command to all implants')
  .action(function (id, cmdObj) {
    if(!id && !cmdObj.all){
        nuages.getImplants();
    }else if(nuages.vars.implants[id] == undefined && !cmdObj.all){
        nuages.term.logError("Implant not found");
    }
    else if(cmdObj.interact) nuages.interactWithImplant(id);
    else if(cmdObj.remove) {
        if(cmdObj.all) nuages.implantService.remove(null, {});
        else nuages.implantService.remove(nuages.vars.implants[id]._id);  
    }
    else if(cmdObj.kill) {
        if(cmdObj.all) {
            nuages.implantService.find({$limit:500}).then(implants => {
                for(var i=0; i< implants.data.length; i++){
                    shortID = implants.data[i]._id.substring(0,6);
                    nuages.createJob(shortID, {type: "exit", options: {}});
                }
            }).catch(err=>{
                nuages.term.logError(err);
            });
        }
        else nuages.createJob(id, {type: "exit", options: {}});
    }
    else if(cmdObj.configure){
        var tmpconfig = {};
        if(cmdObj.value){
            tmpconfig[cmdObj.configure] = cmdObj.value
        }
        if(cmdObj.all) {
            nuages.implantService.find({$limit:500}).then(implants => {
                for(var i=0; i< implants.data.length; i++){
                    shortID = implants.data[i]._id.substring(0,6);
                    nuages.createJob(shortID, {type: "configure", options: {config:tmpconfig}});
                }
            }).catch(err=>{
                nuages.term.logError(err);
            });
        }
        else nuages.createJob(id, {type: "configure", options: {config:tmpconfig}}); 
    }
    else nuages.term.writeln("\r\n" + nuages.printImplants({imp:nuages.vars.implants[id]}));
  })
 
    nuages.commands["!implant"]= new Command()
    .name('!implant')
    .arguments('[options]')
    .exitOverride()
    .description("Apply the !implants command to the current implant");

    nuages.commands["!shell"]= new Command()
    .name('!shell')
    .arguments('<id>')
    .exitOverride()
    .description('Interact with implant')
    .action(function (id) {
        nuages.interactWithImplant(id);
    });

    nuages.commands["!interactive"]= new Command()
    .name('!interactive')
    .arguments('[program] [arguments]')
    .exitOverride()
    .description('Create an interactive channel on the implant')

    nuages.commands["!put"]= new Command()
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

    nuages.commands["!get"]= new Command()
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

    nuages.commands["!files"]= new Command()
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

    nuages.commands["!options"]= new Command()
    .name('!options')
    .description('Show options')
    .exitOverride()
    .option('-g, --global', 'Show global option')
    .action(function (cmdObj) {
        if(cmdObj.global){
            console.log(nuages.printOptions());
        }
        else if(nuages.vars.module){
            console.log(nuages.printModuleOptions());
        }
    });

    nuages.commands["!set"]= new Command()
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

    nuages.commands["!unset"]= new Command()
    .name('!unset')
    .arguments('<key>')
    .exitOverride()
    .description('Unset an option')
    .option('-g, --global', 'Unset a global option')
    .action(function (key, value, cmdObj) {
        var target = cmdObj.global ? nuages.vars.globalOptions : nuages.vars.moduleOptions;
        if(target[key.toLowerCase()] !== undefined){
            target[key.toLowerCase()] = "";
        }
    });

    nuages.commands["!use"]= new Command()
    .name('!use')
    .arguments('<name>')
    .exitOverride()
    .description('Select a module or handler')
    .action(function (name) {
        if (nuages.vars.modules[name.toLowerCase()] !== undefined){
            nuages.vars.module = name.toLowerCase();
            nuages.vars.moduleOptions = nuages.vars.modules[name.toLowerCase()].options;
            if(nuages.vars.moduleOptions.implant && nuages.vars.implants[nuages.vars.globalOptions.implant.value]){
                nuages.vars.moduleOptions.implant.value = nuages.vars.implants[nuages.vars.globalOptions.implant.value]._id;
            }
            nuages.vars.moduletype = "module";
        }else if(nuages.vars.handlers[name.toLowerCase()] !== undefined){
            nuages.vars.module = name.toLowerCase();
            nuages.vars.moduleOptions = nuages.vars.handlers[name.toLowerCase()].options;
            nuages.vars.moduletype = "handler";
        }
        else{
            nuages.term.logError("Module/Handler not found, did you load it?");
        }
    });

    nuages.commands["!modules"]= new Command()
    .name('!modules')
    .arguments('[name]')
    .exitOverride()
    .description('Manage modules')
    .option('-l, --load <path/all>', 'Load a module or all modules')
    .option('-r, --remove', 'Remove the module')
    .action(function (name, cmdObj) {
        if(!name){
            if(cmdObj.load){
                nuages.modloadService.create({modulePath:cmdObj.load}).catch((err) => {
                nuages.term.logError(err.message);
            });
            }else nuages.getModules();
        }else if(nuages.vars.modules[name] == undefined){
            nuages.term.logError("module not found");
        }
        else if(cmdObj.remove) {
            nuages.moduleService.remove(nuages.vars.modules[name.toLowerCase()]._id).catch((err) => {
                nuages.term.logError(err.message);
            });
        }
        else nuages.term.writeln("\r\n" + nuages.printModules({imp:nuages.vars.modules[name]}));
    });

  nuages.commands["!run"]= new Command()
    .name('!run')
    .exitOverride()
    .description('Run the module or handler')
    .option('-a, --autorun', 'Autorun the module on new implants')
    .action(function (cmdObj) {
        if(nuages.vars.moduletype=="module"){
            if(nuages.vars.modules[nuages.vars.module]){
                if(cmdObj.autorun){
                    nuages.modrunService.create({moduleId: nuages.vars.modules[nuages.vars.module]._id, options: nuages.vars.moduleOptions, autorun: true}).then(items => {nuages.getAutoruns()}).catch((err) => {
                        nuages.term.logError(err.message);
                    });
                }
                else{
                    nuages.modrunService.create({moduleId: nuages.vars.modules[nuages.vars.module]._id, options: nuages.vars.moduleOptions, autorun: false}).catch((err) => {
                        nuages.term.logError(err.message);
                    });
                }
            }
            else{
                nuages.term.logError("Module not set");
            }
        }
        else if(nuages.vars.moduletype=="handler"){
            if(nuages.vars.handlers[nuages.vars.module]){
                nuages.listenerService.create({handlerId: nuages.vars.handlers[nuages.vars.module]._id, options: nuages.vars.moduleOptions}).then((run)=>{
                    nuages.listenerStartService.create({id:run._id, wantedStatus: 3}).catch((err) => {
                        nuages.term.logError(err.message);
                    });

                }).catch((err) => {
                        nuages.term.logError(err.message);
                    });
                }else{
                    nuages.term.logError("Handler not set");
                }
            }
        else{
            nuages.term.logError("You have nothing to run!");
        }
    });

    nuages.commands["!autoruns"]= new Command()
    .name('!autoruns')
    .exitOverride()
    .option('-r, --clear', 'Remove all autoruns')
    .description('Manage autoruns')
    .action(function (cmdObj) {
        if (cmdObj.clear) nuages.clearAutoruns();
        else nuages.getAutoruns();
    })

    nuages.commands["!handlers"] = new Command()
    .name('!handlers')
    .arguments('[name]')
    .description('Manage handlers')
    .exitOverride()
    .option('-l, --load <path/name>', 'Load a handler or all handlers')
    .option('-r, --remove', 'Remove the handler')
    .action(function (name, cmdObj) {
    if(!name){
        if(cmdObj.load){
            nuages.handloadService.create({handlerPath:cmdObj.load}).catch((err) => {
                nuages.term.logError(err.message);
            });
        }
        else nuages.getHandlers();
    }else if(nuages.vars.handlers[name] == undefined){
        nuages.term.logError("Handler not found");
    }
    else if(cmdObj.remove) {
        nuages.handlerService.remove(nuages.vars.handlers[name.toLowerCase()]._id).catch((err) => {
            nuages.term.logError(err.message);
        });
    }
    else nuages.term.writeln("\r\n" + nuages.printHandlers({imp:nuages.vars.handlers[name]}));
    })

  nuages.commands["!listeners"] = new Command()
  .name("!listeners")
  .usage("[options] [id]")
  .exitOverride()
  .arguments("[id]")
  .description('Manage listeners')
  .option('-s, --start', 'Start the listener')
  .option('-p, --stop', 'Stop the listener')
  .option('-r, --remove', 'Remove the listener')
  .action(function (id, cmdObj) {
    if(!id){
        nuages.getListeners();
    }else if(nuages.vars.listeners[id] == undefined){
        nuages.term.logError("Listener not found");
    }
    else if(cmdObj.remove) {
        nuages.listenerService.remove(nuages.vars.listeners[id]._id).catch((err) => {
            nuages.term.logError(err.message);
        });
    }
    else if(cmdObj.start) {
        nuages.listenerStartService.create({id:nuages.vars.listeners[id]._id, wantedStatus: 3}).catch((err) => {
            nuages.term.logError(err.message);
        });
    }
    else if(cmdObj.stop) {
            nuages.listenerStartService.create({id:nuages.vars.listeners[id]._id, wantedStatus: 2}).catch((err) => {
                nuages.term.logError(err.message);
            });
    }
    else {
        nuages.term.writeln("\r\n" + nuages.printListeners({imp:nuages.vars.listeners[id]}));
        console.log(nuages.printModuleOptions("handler",nuages.vars.listeners[id].options));
    }
  })

  nuages.commands["!jobs"] = new Command()
  .name("!jobs")
  .arguments("[id]")
  .exitOverride()
  .description('Manage jobs')
  .option('-s, --save <path>', 'Save job output locally')
  .option('-c, --command <command>', 'Filter jobs by command')
  .option('-i, --implant <id>', 'Filter jobs by implant')
  .option('-t, --type <type>', 'Filter jobs by type')
  .option('-m, --max <max>', 'Maximum number of results', 10)
  .action(function (id, cmdObj) {
    if(!id){
        query = {$limit: cmdObj.max, $sort: { lastUpdated: -1 }}
        if(cmdObj.implant && nuages.vars.implants[cmdObj.implant]) query["implantId"] = nuages.vars.implants[cmdObj.implant]._id;
        if(cmdObj.command) query["payload.options.cmd"] = cmdObj.command;
        if(cmdObj.type) query["payload.type"] = cmdObj.type;
        nuages.getJobs(query);
    }else if(nuages.vars.jobs[id] == undefined){
        nuages.term.logError("Job not found");
    }else if(cmdObj.save){
        nuages.saveJobToFile(nuages.vars.jobs[id], cmdObj.save);
    }else{
        nuages.term.writeln("\r\n" + nuages.printJobs({imp:nuages.vars.jobs[id]}));
        nuages.term.writeln("\r\n" + nuages.vars.jobs[id].result);
    }
    })
    
  nuages.commands["!tunnels"] = new Command()
  .name("!tunnels")
  .arguments('[id]')
  .exitOverride()
  .description('Manage Tunnels')
  .option('--tcp', 'Create a tcp tunnel on the current implant')
  .option('--socks', 'Create a socks tunnel on the current implant')
  .option('-l, --listen <address>', 'Listening address [ip:]<port>')
  .option('-d, --destination <address>', 'Destination address <host>:<port>')
  .option('-c, --channels <number>', 'Max number of channels', (a,b)=>{return parseInt(a)})
  .option('-r, --remove', 'Remove tunnel')
  .action(function (id, cmdObj) {
    if(!id){
        if(cmdObj.socks){
            if(!cmdObj.listen){ nuages.term.logError("Option -l/--listen is required"); return;}
            bindAddr = cmdObj.listen.split(":");
            var bindPort = bindAddr.length > 1 ? bindAddr[1] : bindAddr[0];
            var bindIP = bindAddr.length > 1 ? bindAddr[0] : "127.0.0.1";
            if(nuages.vars.globalOptions.implant.value == "" || nuages.vars.globalOptions.implant.value == undefined) {return;}
            nuages.tunnelService.create({
                port:bindPort, 
                type:"socks",
                destination: "socks",
                maxPipes: cmdObj.channels, 
                bindIP: bindIP,
                implantId: nuages.vars.implants[nuages.vars.globalOptions.implant.value]._id,
                jobOptions:{}
            }).then(() => {}).catch((err) => {
                nuages.term.logError(err.message);
            });
        }else if(cmdObj.tcp){
            if(!cmdObj.listen){ nuages.term.logError("Option -l/--listen is required"); return;}
            if(!cmdObj.destination){ nuages.term.logError("Option -d/--destination is required"); return;}
            bindAddr = cmdObj.listen.split(":");
            var bindPort = bindAddr.length > 1 ? bindAddr[1] : bindAddr[0];
            var bindIP = bindAddr.length > 1 ? bindAddr[0] : "127.0.0.1";
            destAddr = cmdObj.destination.split(":");
            if(destAddr.length < 2){
                nuages.term.logError("Destination should be in the format host:port")
                return;
            }
            var destPort = destAddr[1];
            var destIP = destAddr[0];
            if(nuages.vars.globalOptions.implant.value == "" || nuages.vars.globalOptions.implant.value == undefined) {return;}
            nuages.tunnelService.create({
                port:bindPort, 
                type:"tcp_fwd",
                destination: cmdObj.destination,
                maxPipes: cmdObj.channels, 
                bindIP: bindIP,
                implantId: nuages.vars.implants[nuages.vars.globalOptions.implant.value]._id,
                jobOptions:{host:destIP, port:destPort}
            }).then(() => {}).catch((err) => {
                nuages.term.logError(err.message);
            });
        
        }
        else nuages.getTunnels();
    }else if(nuages.vars.tunnels[id] == undefined){
        nuages.term.logError("File not found");
    }else if(cmdObj.remove) {
        nuages.tunnelService.remove(nuages.vars.tunnels[id]._id).catch((err) => {
            nuages.term.logError(err.message);
        });
    }
    else{
        nuages.term.writeln("\r\n" + nuages.printTunnels({imp:nuages.vars.tunnels[id]}));
    }
    });

    nuages.commands["!channels"] = new Command()
    .name("!channels")
    .arguments('[id]')
    .exitOverride()
    .description('Manage channels')
    .option('-r, --remove', 'Remove channel')
    .option('-i, --interact', 'Interact with the channel')
    .action(function (id, cmdObj) {
        if(!id){
            nuages.getPipes();
        }else if(nuages.vars.pipes[id] == undefined){
            nuages.term.logError("Channel not found");
        }else if(cmdObj.remove) {
            nuages.pipeService.remove(nuages.vars.pipes[id]._id).catch((err) => {
                nuages.term.logError(err.message);
            });
        }
        else if(cmdObj.interact) {
            nuages.interactWithPipe(nuages.vars.pipes[id]._id, process.stdin, process.stdout);
        }
        else{
            nuages.term.writeln("\r\n" + nuages.printPipes({imp:nuages.vars.pipes[id]}));
        }
    });

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

    nuages.maincommand.addCommand(nuages.commands["!login"]);
    nuages.maincommand.addCommand(nuages.commands["!implants"]);
    nuages.maincommand.addCommand(nuages.commands["!shell"]);
    nuages.maincommand.addCommand(nuages.commands["!interactive"]);
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
        nuages.commands["!files"].remove = undefined;
        nuages.commands["!files"].upload = undefined;  
        nuages.commands["!files"].save = undefined;
        nuages.commands["!tunnels"].remove = undefined; 
        nuages.commands["!tunnels"].socks = undefined;
        nuages.commands["!tunnels"].tcp = undefined; 
        nuages.commands["!tunnels"].listen = undefined;
        nuages.commands["!tunnels"].destination = undefined;
        nuages.commands["!tunnels"].channels = undefined;
        nuages.commands["!channels"].remove = undefined; 
        nuages.commands["!channels"].interact = undefined; 
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