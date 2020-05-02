const term = require("./term").term;
nuages = require("./nuagesAPI").nuages
const { Command } = require('commander');

nuages.repl = new Command();
nuages.repl.name(" ")
nuages.repl.usage("[command] [options]")
nuages.repl.exitOverride();

nuages.repl.command('!login <username>')
  .description("Login to Nuages");

nuages.repl
  .command('!implants [id]')
  .description('Manage implants')
  .option('-i, --interact', 'Start interacting with the implant')
  .option('-r, --remove', 'Remove the implant')
  .option('-k, --kill', 'Remove the implant')
  .option('-c, --configure [key]', 'Show or modify the implant configuration')
  .option('-v, --value [value]', 'New configuration value')
  .action(function (id, cmdObj) {
    if(!id){
        nuages.getImplants();
    }else if(nuages.vars.implants[id] == undefined){
        nuages.term.logError("Implant not found");
    }
    else if(cmdObj.interact) {nuages.interactWithImplant(id);}
    else if(cmdObj.remove) nuages.implantService.remove(nuages.vars.implants[id]._id);
    else if(cmdObj.kill) nuages.createJob(id, {type: "exit", options: {}});
    else if(cmdObj.configure){
        var tmpconfig = {};
        if(cmdObj.value){
            tmpconfig[cmdObj.configure] = cmdObj.value
        }
        nuages.createJob(id, {type: "configure", options: {config:tmpconfig}}); 
    }
    else nuages.term.writeln("\r\n" + nuages.printImplants({imp:nuages.vars.implants[id]}));
  })

  nuages.repl.command('!implant [options]')
  .description("Apply the !implants command to the current implant");

    nuages.repl
    .command('!shell <id>')
    .description('Interact with implant')
    .action(function (id) {
    nuages.interactWithImplant(id);
    });

    nuages.repl
    .command('!interactive')
    .description('Create an interactive channel on the implant')

    nuages.repl
    .command('!put <id> [path]')
    .description('Start a download job on the current implant')
    .action(function (id, path) {
        if(nuages.vars.files[id] == undefined) throw("File not found")
        var file = path ? path : nuages.vars.files[id].filename;
        nuages.createJobWithPipe(nuages.vars.globalOptions.implant.value, 
            {type:"download", 
                options:{ 
                    file: file, 
                    filename: nuages.vars.files[id].filename, 
                    length: nuages.vars.files[id].length, 
                    path: nuages.vars.paths[nuages.vars.globalOptions.implant.value.substring(0.6)]
                }, 
            },
            {type: "download",
                source: nuages.vars.files[id]._id,
                destination: file,
                implantId: nuages.vars.globalOptions.implant.value
            }).catch((err) => {
                nuages.term.logError(err.message);
            });
    });

    nuages.repl
    .command('!get <path>')
    .description('Start an upload job on the current implant')
    .action(function (path) {
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

nuages.repl
  .command('!files [id]')
  .description('Manage files')
  .option('-r, --remove', 'Remove file')
  .option('-s, --save <path>', 'Download the file to the local client')
  .action(function (id, cmdObj) {
    if(!id){
        nuages.getFiles();
    }else if(nuages.vars.files[id] == undefined){
        nuages.term.logError("File not found");
    }else if(cmdObj.remove) {
        nuages.fileService.remove(nuages.vars.files[id]._id).catch((err) => {
            nuages.term.logError(err.message);
        });
    }
    else if(cmdObj.save) {
        nuages.downloadFile(id, cmdObj.save);
    }
    else{
        nuages.term.writeln("\r\n" + nuages.printFiles({imp:nuages.vars.files[id]}));
    }
    })
    .command('upload <path>')
    .description('Upload a file from the local client')
    .action((path)=>{
    nuages.uploadFile(path); 
  });

    nuages.repl
    .command('!options')
    .description('Show options')
    .option('-g, --global', 'Show global option')
    .action(function (cmdObj) {
        if(cmdObj.global){
            console.log(nuages.printOptions());
        }
        else if(nuages.vars.module){
            console.log(nuages.printModuleOptions());
        }
    });

    nuages.repl
    .command('!set [key] [value]')
    .description('Set an option')
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

    nuages.repl
    .command('!unset [key]')
    .description('Unset an option')
    .option('-g, --global', 'Unset a global option')
    .action(function (key, value, cmdObj) {
        var target = cmdObj.global ? nuages.vars.globalOptions : nuages.vars.moduleOptions;
        if(target[key.toLowerCase()] !== undefined){
            target[key.toLowerCase()] = "";
        }
    });

    nuages.repl
    .command('!use <name>')
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

nuages.repl
  .command('!modules [name]')
  .description('Manage modules')
  .option('-r, --remove', 'Remove the module')
  .action(function (name, cmdObj) {
    if(!name){
        nuages.getModules();
    }else if(nuages.vars.modules[name] == undefined){
        nuages.term.logError("module not found");
    }
    else if(cmdObj.remove) {
        nuages.moduleService.remove(nuages.vars.modules[name.toLowerCase()]._id).catch((err) => {
            nuages.term.logError(err.message);
        });
    }
    else nuages.term.writeln("\r\n" + nuages.printModules({imp:nuages.vars.modules[name]}));
  })
  .command('load <path>')
  .description("Load a module or all modules")
  .action((path)=>{
    nuages.modloadService.create({modulePath:path}).catch((err) => {
        nuages.term.logError(err.message);
    });
  });
  nuages.repl.command('!run')
    .description('Run the module or handler')
    .action(function () {
        if(nuages.vars.moduletype=="module"){
            if(nuages.vars.modules[nuages.vars.module]){
                nuages.modrunService.create({moduleId: nuages.vars.modules[nuages.vars.module]._id, options: nuages.vars.moduleOptions, autorun: false}).catch((err) => {
                        nuages.term.logError(err.message);
                    });
                }else{
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

    nuages.repl.command('!autorun')
    .description('Autorun this module on new implants')
    .action(function () {
        if(nuages.vars.modules[nuages.vars.module]){
            nuages.modrunService.create({moduleId: nuages.vars.modules[nuages.vars.module]._id, options: nuages.vars.moduleOptions, autorun: true}).then(items => {nuages.getAutoruns()}).catch((err) => {
                nuages.term.logError(err.message);
            });
        }else{
            nuages.term.logError("No module set!");
        }
    });

    nuages.repl.command('!autoruns')
    .description('Manage autoruns')
    .action(function () {
        nuages.getAutoruns();
    })
    .command('clear')
    .description("Remove all autoruns")
    .action(()=>{
        nuages.clearAutoruns();
    })
   nuages.repl
  .command('!handlers [name]')
  .description('Manage handlers')
  .option('-r, --remove', 'Remove the handler')
  .action(function (name, cmdObj) {
    if(!name){
        nuages.getHandlers();
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
  .command('load <path>')
  .description("Load a handler or all handlers")
  .action((path)=>{
    nuages.handloadService.create({handlerPath:path}).catch((err) => {
        nuages.term.logError(err.message);
    });
  });

  listener_command = new Command();

  listener_command
  .name("!listeners")
  .usage("[start/stop] [id]")
  .exitOverride()
  .arguments("[id]")
  .description('Manage listeners')
  .action(function (name, cmdObj) {
    if(!name){
        nuages.getListeners();
    }else if(nuages.vars.listeners[name] == undefined){
        nuages.term.logError("Listener not found");
    }
    else if(cmdObj.remove) {
        nuages.listenerService.remove(nuages.vars.listeners[name.toLowerCase()]._id).catch((err) => {
            nuages.term.logError(err.message);
        });
    }
    else nuages.term.writeln("\r\n" + nuages.printListeners({imp:nuages.vars.listeners[name]}));
  })
  .command('start <id>')
  .description("Start the listener")
  .action((id)=>{
    nuages.listenerStartService.create({id:nuages.vars.listeners[id]._id, wantedStatus: 3}).catch((err) => {
        nuages.term.logError(err.message);
    });
  });
  listener_command.command('stop <id>')
  .description("Stop the listener")
  .action((id)=>{
    nuages.listenerStartService.create({id:nuages.vars.listeners[id]._id, wantedStatus: 2}).catch((err) => {
        nuages.term.logError(err.message);
    });
  });

  nuages.repl
  .command('!jobs [id]')
  .description('Manage jobs')
  .option('-o, --output <path>', 'Save job output locally')
  .action(function (id, cmdObj) {
    if(!id){
        nuages.getJobs();
    }else if(nuages.vars.jobs[name] == undefined){
        nuages.term.logError("Job not found");
    }else if(cmdObj.output){
        nuages.saveTextToFile(nuages.vars.jobs[id].result,cmdObj.outpout );
    }else{
        nuages.term.writeln("\r\n" + nuages.printJobs({imp:nuages.vars.jobs[id]}));
        nuages.term.writeln("\r\n" + nuages.vars.jobs[id].result);
    }
    })
    .command('search')
    .description("Search jobs")
    .option('-c, --command <command>', 'Filter jobs by command')
    .option('-i, --implant <id>', 'Filter jobs by implant')
    .option('-t, --type <type>', 'Filter jobs by type')
  .action((cmdObj)=>{
    query = {$limit: 20, $sort: { lastUpdated: -1 }}
    if(cmdObj.implant && nuages.vars.implantId[cmdObj.implant]) query[implantId] = nuages.vars.implantId[cmdObj.implant]._id;
    if(cmdObj.command) query["payload.options.cmd"] = cmdObj.command;
    if(cmdObj.type) query["payload.type"] = cmdObj.type;
    nuages.getJobs(cmdArray[2]);
  });

  nuages.repl.addCommand(listener_command)
  tunnels_command = new Command()
  tunnels_command.exitOverride();
  tunnels_command
  .name("!tunnels")
  .arguments('[id]')
  .description('Manage Tunnels')
  .option('-r, --remove', 'Remove tunnel')
  .action(function (id, cmdObj) {
    if(!id){
        nuages.getTunnels();
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
    tunnels_command.command('socks')
    .description('Create a socks tunnel on the current implant')
    .option('-l, --listen <address>', 'Listening address [ip:]<port>')
    .action((cmdObj)=>{
        bindAddr = cmdObj.listen.split(":");
        var bindPort = bindAddr.length > 1 ? bindAddr[1] : bindAddr[0];
        var bindIP = bindAddr.length > 1 ? bindAddr[0] : "127.0.0.1";
        if(nuages.vars.globalOptions.implant.value == "" || nuages.vars.globalOptions.implant.value == undefined) {return;}
        nuages.tunnelService.create({
            port:bindPort, 
            type:"socks",
            destination: "socks",
            maxPipes: parseInt(nuages.vars.globalOptions.maxchannels.value), 
            bindIP: bindIP,
            implantId: nuages.vars.implants[nuages.vars.globalOptions.implant.value]._id,
            jobOptions:{}
        }).then(() => {}).catch((err) => {
            nuages.term.logError(err.message);
        });
     });
    tunnels_command.command('tcp')
    .description('Create a tcp tunnel on the current implant')
    .option('-l, --listen <address>', 'Listening address [ip:]<port>')
    .option('-d, --destination <address>', 'Destination address <host>:<port>')
    .action((cmdObj)=>{
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
            destination: cmdArray[3],
            maxPipes: parseInt(nuages.vars.globalOptions.maxchannels.value), 
            bindIP: bindIP,
            implantId: nuages.vars.implants[nuages.vars.globalOptions.implant.value]._id,
            jobOptions:{host:destIP, port:destPort}
        }).then(() => {}).catch((err) => {
            nuages.term.logError(err.message);
        });
     });

   nuages.repl.addCommand(tunnels_command);

   nuages.repl
  .command('!channels [id]')
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

    nuages.repl
    .command('!back')
    .description('Exit implant, module and handler')
    .action(function () {
        nuages.vars.globalOptions.implant.value= ""; 
        nuages.vars.module = ""; 
    });

    nuages.repl
    .command('!exit')
    .alias('!quit')
    .description('Exit the program')
    .action(function () {
        process.exit(0);
    });

    nuages.repl.addHelpCommand('!help [command]', 'Show help');

    nuages.resetRepl = function(repl){
    //for(i=0; i < repl.commands.length; i++){
    //  console.log(i + " " + repl.commands[i]._name);
    //}
    repl.commands[1].configure = undefined; // Implants
    repl.commands[1].value = undefined;
    repl.commands[1].kill = undefined;
    repl.commands[1].remove = undefined;
    repl.commands[1].interact = undefined;
    repl.commands[8].global = undefined; // Options
    repl.commands[9].global = undefined; // Set
    repl.commands[10].global = undefined; // Unser
    repl.commands[16].remove = undefined; // Handlers
    repl.commands[12].remove = undefined; // Modules
    repl.commands[17].remove = undefined; // Listeners
    repl.commands[18].commands[0].command = undefined; // Jobs
    repl.commands[18].commands[0].implant = undefined; 
    repl.commands[18].commands[0].type = undefined; 
    repl.commands[7].remove = undefined; // Files
    repl.commands[7].save = undefined;
    repl.commands[19].remove = undefined; // Tunnels
    repl.commands[19].commands[0].listen = undefined;
    repl.commands[19].commands[1].listen = undefined;
    repl.commands[19].commands[1].destination = undefined;
    repl.commands[20].remove = undefined; // Channels
    repl.commands[20].interact = undefined; 
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
            if( str.charAt(i) === quoteStyle){
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
    if(cmdArray[0].toLowerCase() == "!implant"){
        cmdArray.splice(1, 0, nuages.vars.globalOptions.implant.value);
        cmdArray[0]="!implants";
    }
    if (cmdArray[0].toLowerCase() == "!login" && cmdArray.length > 1){
        nuages.term.passwordMode = true;
        nuages.term.username = cmdArray[1];
    }
    else if (cmdArray[0].toLowerCase() == "cd"){
        if(nuages.vars.implants[nuages.vars.globalOptions.implant.value.substring(0.6)].supportedPayloads.includes("cd")){
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
       nuages.resetRepl(nuages.repl);
       nuages.repl.parse(cmdArray, { from: 'user' });
    }
    else if(cmdArray[0].length > 0){
        if(nuages.vars.globalOptions.implant.value == "" || nuages.vars.globalOptions.implant.value == undefined) {return;}
        nuages.createJob(nuages.vars.globalOptions.implant.value, {type:"command", options:{ path: nuages.vars.paths[nuages.vars.globalOptions.implant.value.substring(0.6)], cmd: cmd}});
    }
    return;
}

exports.execute = executeCommand;
