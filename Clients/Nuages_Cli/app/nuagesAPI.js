const { Command } = require('commander');

nuages = {}
nuages.program = new Command();
nuages.program.version('0.2.0');
nuages.program.name == "Nuages Cli"

nuages.program
  .option('-u, --url <url>', 'The Nuages API URI', "http://127.0.0.1:3030")
  .option('--ASCII', 'Use ASCII tables')

nuages.program.parse(process.argv);

const table = require('table').table;
const getBorderCharacters = require('table').getBorderCharacters;
const feathers = require('@feathersjs/client');
var path = require("path");
var fs = require("fs");
const io = require('socket.io-client');
//var endpoint = process.argv[2] ? process.argv[2]  : "http://127.0.0.1:3030";
const socket = io(nuages.program.url);
const app = feathers();

app.configure(feathers.authentication({}));
app.configure(feathers.socketio(socket));

nuages.implantService = app.service('implants');
nuages.jobService = app.service('jobs');
nuages.fileService = app.service('/fs/files');
nuages.modrunService = app.service('/modules/run');
nuages.moduleService = app.service('/modules');
nuages.logService = app.service('/logs');
nuages.modloadService = app.service('/modules/load');
nuages.handlerService = app.service('/handlers');
nuages.listenerService = app.service('/listeners');
nuages.listenerStartService = app.service('/listeners/startstop');
nuages.handloadService = app.service('/handlers/load');
nuages.tunnelService = app.service('/tunnels');
nuages.pipeService = app.service('/pipes');
nuages.ioService = app.service('/pipes/io');

nuages.vars = { 
    implants: {},
    pipes: {},
    paths:{},
    files: {},
    modules: {},
    handlers: {},
    jobs: {},
    listeners: {},
    module: ""
};

nuages.vars.globalOptions = {
        implant: {
            value: "",
            description: "The implant to interact with"
        },
        timeout:{
            value: 1,
            description: "The job timeout, in minutes"
        },
        buffersize:{
            value: 261120,
            description: "The size of the buffer for channels"
        },
        refreshrate:{
            value: 50,
            description: "The channel refresh rate in ms"
        },
        maxchannels:{
            value: 50,
            description: "The maximum number of channels for created tunnels"
        },
        newlinemode:{
            value: "Windows",
            description: "The newline mode for interactive channels (Windows/Posix)"
        }
};
    
nuages.vars.moduleOptions = {};

nuages.templates={};

nuages.templates.implants = [
    {   
        header: "ID",
        attr: "_id",
        process: (e)=>{return term.toBold(term.toBlue(e.substring(0,6)))},
        size: 8,
    },
    {   
        header: "Type",
        attr: "implantType",
    },
    {   
        header: "OS",
        attr: "os",
    },
    {   
        header: "Hostname",
        attr: "hostname",
    },
    {   
        header: "Username",
        attr: "username",
    },
    {   
        header: "Local IP",
        attr: "localIp",
    },
    {   
        header: "Listener",
        attr: "listener",
        process: (e)=>{return term.toBold(term.toYellow(e.substring(0,6)))}
    },
    {   
        header: "Last Seen",
        attr: "lastSeen",
        process: (e)=>{return nuages.formatImplantLastSeen(e)}
    },

];


nuages.templates.modules = [
    {   
        header: "Name",
        attr: "name",
        process: (e)=>{return term.toBold(term.toMagenta(e))},
    },
    {   
        header: "Description",
        attr: "description",
        size: 70
    },
];

nuages.templates.globalOptions = [
    {   
        header: "Name",
        attr: "name",
        process: (e)=>{return term.toBold(e)},
    },
    {   
        header: "Value",
        attr: "value",
    },
    {   
        header: "Description",
        attr: "description",
    }
];
nuages.templates.moduleOptions = [
    {   
        header: "Name",
        attr: "name",
        process: (e)=>{return term.toBold(e)},
    },
    {   
        header: "Required",
        attr: "required",
    },
    {   
        header: "Value",
        attr: "value",
    },
    {   
        header: "Description",
        attr: "description",
    }
];

nuages.templates.handlers = [
    {   
        header: "Name",
        attr: "name",
        process: (e)=>{return term.toYellow(term.toBold(e))},
    },
    {   
        header: "Description",
        attr: "description",
        size: 70
    },
];

nuages.templates.listeners = [
    {   
        header: "ID",
        attr: "_id",
        process: (e)=>{return term.toBold(e.substring(0,6))},
        size: 8,
    },
    {   
        header: "Type",
        attr: "handlerName",
        process: (e)=>{return term.toYellow(term.toBold(e))},
    },
    {   
        header: "Implants",
        attr: "implantNo"
    },
    {   
        header: "PID",
        attr: "pid"
    },
    {   
        header: "Status",
        attr: "runStatus",
        process: (e)=>{var statusCodes = ["","Submitted", nuages.term.toRed(term.toBold("Stopped")), nuages.term.toGreen(term.toBold("Running")), nuages.term.toRed(term.toBold("Failed"))]; return statusCodes[e]},
    },
];


nuages.templates.files = [
    {   
        header: "ID",
        attr: "_id",
        process: (e)=>{return term.toBold((e.substring(0,6)))},
    },
    {   
        header: "Size",
        attr: "length",
        process: (e)=>{return nuages.humanFileSize(Math.floor(e))}
    },
    {   
        header: "Uploaded By",
        attr: "uploadedBy",
        process: (e)=>{return e.substring(0,6)}
    },
    {   
        header: "Upload Date",
        attr: "uploadDate",
        process: (e)=>{return nuages.humanDate(e)}
    },
    {   
        header: "Name",
        attr: "filename"
    },
];
nuages.templates.pipes = [
    {   
        header: "ID",
        attr: "_id",
        process: (e)=>{return term.toBold((e.substring(0,6)))},
    },
    {   
        header: "Type",
        attr: "type",
    },
    {   
        header: "Source",
        attr: "source",
        process: (e,o)=>{if(o.type == "download"){return e.substring(0,6)}else{return e}},
    },
    {   
        header: "Implant",
        attr: "implantId",
        process: (e)=>{return term.toBold(term.toBlue(e.substring(0,6)))},
    },
    {   
        header: "Destination",
        attr: "destination",
        process: (e,o)=>{if(o.type == "upload"){return e.substring(0,6)}else{return e}},
    }
];

nuages.templates.tunnels = [
    {   
        header: "ID",
        attr: "_id",
        process: (e)=>{return term.toBold((e.substring(0,6)))},
    },
    {   
        header: "Type",
        attr: "type",
    },
    {   
        header: "Bind Address",
        attr: "bindIP",
    },
    {   
        header: "Port",
        attr: "port",
    },
    {   
        header: "Implant",
        attr: "implantId",
        process: (e)=>{return term.toBold(term.toBlue(e.substring(0,6)))},
    },
    {   
        header: "Destination",
        attr: "destination",
    },
    {   
        header: "Channels",
        attr: "pipeNo",
    },
    {   
        header: "Max Channels",
        attr: "maxPipes",
    }
];

nuages.templates.jobs = [
    {   
        header: "ID",
        attr: "_id",
        process: (e)=>{return term.toBold((e.substring(0,6)))},
    },
    {   
        header: "Implant",
        attr: "implantId",
        process: (e)=>{return term.toBold(term.toBlue(e.substring(0,6)))},
    },
    {   
        header: "Status",
        attr: "jobStatus",
        process: (e)=>{var statusCodes = ["Pending ", "Received", "Running", nuages.term.toGreen(nuages.term.toBold("Success")), nuages.term.toRed(nuages.term.toBold("Failed"))]; return statusCodes[e]},
    },
    {   
        header: "Type",
        attr: "payload",
        process: (e)=>{return e.type},
    },
    {   
        header: "Options",
        attr: "payload",
        process: (e)=>{return nuages.printJobOptions(e)},
        size: 10
    },
    {   
        header: "Result",
        attr: "result",
        size: 40,
        process: (e)=>{return e.replace(/[\u0001-\u0006\u0008-\u0009\u000B-\u001A]/g, "").substring(0,115);}
    }
];

nuages.toTable = function (template, objects){
    // instantiate
    //template = nuages.templates.implant;
    //var objects = nuages.vars.implants;
    objects = Object.values(objects);
    //console.log('Terminal size: ' + process.stdout.columns + 'x' + process.stdout.rows);
    
    var Headers = [];

    var data = [Headers];

    var config = {
        border: (nuages.program.ASCII? getBorderCharacters("ramac"):getBorderCharacters("honeywell")),
        columns: {}
      };

    for(var i=0; i< template.length; i++){
        var el = template[i];
        Headers.push(term.toBold(el.header));
        config.columns[i] = {};
        if(el.size){
            config.columns[i].width = el.size;
        }
    }
    objects.forEach(obj =>{
        var row = [];
        template.forEach(col=>{
            if(col.process){
                try{
                    var value = col.process(obj[col.attr], obj);
                }catch(e){
                    var value = "";
                }
            }else{
                var value = obj[col.attr];
            }
            row.push(value);
        });
        data.push(row);
    });

       
      return table(data, config).toString();
}

nuages.uploadFile = async function(filePath) {
    if(fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()){
        nuages.term.logError("This is a directory"); return
    }
    var CHUNK_SIZE = parseInt(nuages.vars.globalOptions.buffersize.value);
    buffer = new Buffer.alloc(CHUNK_SIZE);
    fs.open(filePath, 'r', async function(err, fd) {
        if (err) {nuages.term.logError(err.message); return};
        var pipe = await nuages.pipeService.create({type:"upload", source: filePath, filename: path.basename(filePath)});
        if (!pipe){nuages.term.logError("Error creating pipe"); return}
        async function readNextChunk() {
          fs.read(fd, buffer, 0, CHUNK_SIZE, null, async function(err, nread) {
            if (err || nread === 0) {
                nuages.pipeService.remove(pipe._id).catch((err) => {
                    nuages.term.logError(err.message);
                });	
                fs.close(fd, function(err) {
                    if (err) throw err;
                });
                if(err){
                    nuages.term.logError(err.message);
                }
                term.logSuccess("Uploaded: "+ filePath)
                return;
            };
            var data;
            if (nread < CHUNK_SIZE)
              data = buffer.slice(0, nread);
            else
              data = buffer;
              try{
                // We dont really have to wait but lets spare the server
                await nuages.ioService.create({pipe_id: pipe._id, in:data.toString('base64')});
              }catch(err){
                nuages.term.logError(err.message);
                return;
              }
            readNextChunk();
          });
        }
        readNextChunk()
      });
}

nuages.sleep = function(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};  
nuages.downloadFile = async function(fileId, filePath){
    filePath = !(fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) ? filePath : path.resolve(filePath, nuages.vars.files[fileId].filename);
    if (nuages.vars.files[fileId] != undefined){
        try{
            var pipe = await nuages.pipeService.create({type:"download", source: nuages.vars.files[fileId]._id, destination: filePath, bufferSize: nuages.vars.globalOptions.buffersize.value});
            var writeStream = fs.createWriteStream(filePath);
            var dlBytes = 0;
            while(dlBytes < nuages.vars.files[fileId].length){
                await nuages.sleep(nuages.vars.globalOptions.refreshrate.value);
                var data = await this.ioService.create({pipe_id: pipe._id});
                if(data.out && data.out.length > 0){
                    var buff = Buffer.from(data.out, 'base64');
                    dlBytes+=buff.length;
                    data = writeStream.write(buff);
                }
            }
            term.logSuccess("Downloaded: "+ filePath);
        }catch(err){
            nuages.term.logError(err.message);
        }
        finally{
            if(writeStream){
                writeStream.close();
            }if(pipe){
                nuages.pipeService.remove(pipe._id).catch((err) => {
                    nuages.term.logError(err.message);
                });
            }
        }
    }
};


nuages.saveJobToFile = async function(job, filePath){
    try{
        filePath = !(fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) ? filePath : path.resolve(filePath, job._id + ".job");
        var writeStream = fs.createWriteStream(filePath);
        writeStream.write(job.result);
        writeStream.close();
        nuages.term.logInfo(filePath + " saved");
        return;
    }catch(e){nuages.term.logError(e);}
};

// Everything below this should be the same in the WebCli

function makeid(length) { //Not made to be secure - just to differentiates sessions as we are only using one user for now
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

nuages.login = async function(user,password){
    try {
        //await app.logout();
        nuages.vars.user = {email: user, password: password}
        const payload = Object.assign({ strategy: 'local' }, nuages.vars.user);
        await app.authenticate(payload);
        nuages.term.logSuccess("Authentication Successful", user.email);
        nuages.getImplants();
        nuages.getModules(false);
        nuages.getHandlers(false);
        nuages.getFiles(false);
        nuages.getListeners(false);
        nuages.getPipes(false);
        nuages.getTunnels(false);
        nuages.vars.session = makeid(32);
    } catch(error) {
    // If we got an error, show the login page
        nuages.term.logError(error.message);
    }
}

nuages.formatImplantLastSeen = function(timestamp){
        var difference = new Date().getTime() - new Date(timestamp).getTime();
        var daysDifference = Math.floor(difference/1000/60/60/24);
        difference -= daysDifference*1000*60*60*24;
        var hoursDifference = Math.floor(difference/1000/60/60);
        difference -= hoursDifference*1000*60*60;
        var minutesDifference = Math.floor(difference/1000/60);
        difference -= minutesDifference*1000*60;
        var final = nuages.humanDate(timestamp);
        if (daysDifference > 1) {return (nuages.term.toBold(nuages.term.toRed(final)));}
        if (minutesDifference <= 5 && hoursDifference < 1) {return (nuages.term.toBold(nuages.term.toGreen(final)));}
        return final;
}

nuages.printImplants= function (imp){
    return nuages.toTable(nuages.templates.implants, imp);
}

nuages.humanFileSize = function(size) {
    if(size==0){
        return "0";
    }
    var i = Math.floor( Math.log(size) / Math.log(1024) );
    return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
};

nuages.printJobOptions = function(payload) {
    if(payload.type == "command"){
        return payload.options.cmd;
    }
    if(payload.type == "upload" || payload.type == "download"){
        return payload.options.file;
    }
    if(payload.type == "cd"){
        return payload.options.dir;
    }
    if(payload.type == "configure"){
        return payload.options.config;
    }
    if(payload.type == "interactive"){
        return payload.options.filename;
    }
    if(payload.type == "socks"){
        return payload.options.pipe_id.substring(0,6);
    }
    return "";
};

nuages.humanDate = function(ts) {
    return new Date(ts).toLocaleDateString('en-GB', {day : 'numeric', month : 'numeric', hour: 'numeric', minute: "numeric", second: "numeric"});
}; 
nuages.printFiles = function(files){
    return nuages.toTable(nuages.templates.files, files);
}

nuages.printModules = function(modules){
    return nuages.toTable(nuages.templates.modules, modules);
}


nuages.printHandlers = function(handlers){
    return nuages.toTable(nuages.templates.handlers, handlers);
}

nuages.printListeners = function(listeners){
    return nuages.toTable(nuages.templates.listeners, listeners);
}

nuages.printPipes = function(pipes){
    return nuages.toTable(nuages.templates.pipes, pipes);
}

nuages.printTunnels = function(tunnels){
    return nuages.toTable(nuages.templates.tunnels, tunnels);
}

nuages.printJobs = function(jobs){
    return nuages.toTable(nuages.templates.jobs , jobs);
}

nuages.printOptions = function(){
    string = "\r\n ["+nuages.term.toBold(nuages.term.toBlue("Global"))+"]\r\n" 
    var optionKeys = Object.keys(nuages.vars.globalOptions);
    for(var i = 0; i < optionKeys.length; i++){
        nuages.vars.globalOptions[optionKeys[i]].name = optionKeys[i];
    }
    return string+=nuages.toTable(nuages.templates.globalOptions , nuages.vars.globalOptions);
}

nuages.printModuleOptions = function(moduletype = nuages.vars.moduletype, options = nuages.vars.moduleOptions){
    var optionKeys = Object.keys(options);
    if(moduletype == "module"){
        var string = "\r\n ["+nuages.term.toBold(nuages.term.toMagenta("Module"))+"]\r\n"
    }else{var string = "\r\n ["+nuages.term.toBold(nuages.term.toYellow("Handler"))+"]\r\n"}
    for(var i = 0; i < optionKeys.length; i++){
        options[optionKeys[i]].name = optionKeys[i];
    }
    return string+=nuages.toTable(nuages.templates.moduleOptions , options);
}

nuages.getImplants = async function(){
    nuages.vars.implants = {};
    nuages.implantService.find({query: {$limit: 200}}).then(items => {
        for(var i = 0; i< items.data.length; i++){
            nuages.vars.implants[items.data[i]._id.substring(0,6)] = items.data[i]
        }; 
            nuages.term.logInfo("Implants:\r\n" + nuages.printImplants(items.data)); 
        }).catch((err) => {
            nuages.term.logError(err.message);
        });
    
}

nuages.getModules = function(print = true){
    nuages.vars.modules = {};
    nuages.moduleService.find({query: {$limit: 200}}).then(items => {
        for(var i = 0; i< items.data.length; i++){
            nuages.vars.modules[items.data[i].name] = items.data[i]
        }; 
            if(print){
                nuages.term.logInfo("Modules:\r\n" + nuages.printModules(items.data)); 
            }
        }).catch((err) => {
            nuages.term.logError(err.message);
        });
}

nuages.getHandlers = function(print = true){
    nuages.vars.handlers = {};
    nuages.handlerService.find({query: {$limit: 200}}).then(items => {
        for(var i = 0; i< items.data.length; i++){
            nuages.vars.handlers[items.data[i].name] = items.data[i]
        }; 
            if(print){
                nuages.term.logInfo("Handlers:\r\n" + nuages.printHandlers(items.data)); 
            }
        }).catch((err) => {
            nuages.term.logError(err.message);
        });
}

nuages.getListeners = function(print = true){
    nuages.vars.listeners = {};
    nuages.listenerService.find({query: {$limit: 200}}).then(items => {
        for(var i = 0; i< items.data.length; i++){
            nuages.vars.listeners[items.data[i]._id.substring(0,6)] = items.data[i]
        }; 
            if(print){
                nuages.term.logInfo("Listeners:\r\n" + nuages.printListeners(items.data)); 
            }
        }).catch((err) => {
            nuages.term.logError(err.message);
        });
}


nuages.getPipes = function(print = true){
    nuages.vars.pipes = {};
    nuages.pipeService.find({query: {$limit: 200}}).then(items => {
        for(var i = 0; i< items.data.length; i++){
            nuages.vars.pipes[items.data[i]._id.substring(0,6)] = items.data[i];
        }; 
            if(print){
                nuages.term.logInfo("Channels:\r\n" + nuages.printPipes(items.data)); 
            }
        }).catch((err) => {
            nuages.term.logError(err.message);
        });
}

nuages.getTunnels = function(print = true){
    nuages.vars.tunnels = {};
    nuages.tunnelService.find({query: {$limit: 200}}).then(items => {
        for(var i = 0; i< items.data.length; i++){
            nuages.vars.tunnels[items.data[i]._id.substring(0,6)] = items.data[i];
        }; 
            if(print){
                nuages.term.logInfo("Tunnels:\r\n" + nuages.printTunnels(items.data)); 
            }
        }).catch((err) => {
            nuages.term.logError(err.message);
        });
}

nuages.getFiles = async function(print = true){
    nuages.vars.files = {};
    try{
        items = await nuages.fileService.find({query: {$limit: 200}});
        }catch(e){nuages.term.printError(e); return}
    for(var i = 0; i< items.data.length; i++){
        nuages.vars.files[items.data[i]._id.substring(0,6)] = items.data[i]
    };
    if(print){
        nuages.term.logInfo("Files:\r\n" + nuages.printFiles(items.data)); 
    }
}

nuages.getAutoruns = async function(){
    try{
        items = await nuages.modrunService.find({query: {autorun: true}});
        }catch(e){nuages.term.printError(e); return}
    var str = "";
    for(var i=0; i< items.data.length; i++){
        str += items.data[i].moduleName +"\r\n";
    }
    nuages.term.logInfo("Autoruns:\r\n" + str); 
}

nuages.clearAutoruns = async function(){
    try{
        autoruns = await nuages.modrunService.find({query: {autorun: true}});
        }catch(e){nuages.term.printError(e); return}
    for(var i=0; i< autoruns.data.length; i++){
        nuages.modrunService.remove(autoruns.data[i]._id).then(item => {
                nuages.term.logInfo("Deleted Autorun: " + item.moduleName); 
        }).catch((err) => {
                nuages.term.logError(err.message);
            });;
    }
}

nuages.clearImplants = async function(){
    try{
        implants = await nuages.implantService.find();
        }catch(e){nuages.term.printError(e); return}
    for(var i=0; i< implants.data.length; i++){
        nuages.implantService.remove(implants.data[i]._id).then(item => {}).catch((err) => {
                nuages.term.logError(err.message);
            });;
    }
}

nuages.getJobs = async function(query){
    try{
        if(query == undefined){
           items = await nuages.jobService.find({query: {$limit: 20, $sort: { lastUpdated: -1 }}});
        }else{
           items = await nuages.jobService.find({query: query});
        }
        }catch(e){nuages.term.printError(e);}
    for(var i = 0; i< items.data.length; i++){
        nuages.vars.jobs[items.data[i]._id.substring(0,6)] = items.data[i]
    };
    nuages.term.logInfo("Jobs:\r\n" + nuages.printJobs(items.data)); 
}

nuages.createJob = function (implant, payload){
    var timeout = Date.now() + parseInt(nuages.vars.globalOptions.timeout.value) * 60000;
    if (nuages.vars.implants[implant] != undefined){
        nuages.jobService.create({
            implantId: nuages.vars.implants[implant]._id,
            timeout: timeout,
            vars: {session: nuages.vars.session},
            payload: payload}
            ).catch((err) => {
                nuages.term.logError(err.message);
            });
    }else{
    }
}

nuages.createJobWithPipe = function (implant, payload, pipe){
    var timeout = Date.now() + parseInt(nuages.vars.globalOptions.timeout.value) * 60000;
    pipe.implantId = nuages.vars.implants[implant]._id;
    if (nuages.vars.implants[implant] != undefined){
        return nuages.jobService.create({
            implantId: nuages.vars.implants[implant]._id,
            timeout: timeout,
            vars: {session: nuages.vars.session},
            pipe: pipe,
            payload: payload}
            );
    }else{
    }
}

nuages.processJobPatched = function (job){
    if(job.moduleRun !== null){
        return;
    }
    if(job.vars.session === undefined || job.vars.session != nuages.vars.session){
        return;
    }
    if(job.payload.type=="command" && job.payload.options.cd == true && job.result){
        if(job.result.split('\n').length > 3){
            nuages.vars.paths[job.implantId.substring(0,6)] = job.result.split('\n')[2].trim();
        }else{
            nuages.term.logError("Path not found");
        }
        nuages.term.reprompt();
    }else if(job.payload.type=="cd" && job.jobStatus == 3 && job.result){
        nuages.vars.paths[job.implantId.substring(0,6)] = job.result;
        nuages.term.reprompt();
    }
    else if(job.jobStatus == 4){
        if(job.payload.type=="command"){
            nuages.term.logError("Failed command: " + job.payload.options.cmd +"\r\n" + job.result, job.implantId.substring(0,6));
        }else{
            nuages.term.logError(job.payload.type + " failed:\r\n " + job.result, job.implantId.substring(0,6));
        }
    }
    else if(job.jobStatus == 3){
        if(job.payload.type=="command"){
            nuages.term.logSuccess("Received result for command: " + job.payload.options.cmd +"\r\n" + job.result, job.implantId.substring(0,6));
        }
        else {
            nuages.term.logSuccess(job.payload.type + " succeeded:" +"\r\n" + job.result, job.implantId.substring(0,6));
        }
    }
}

nuages.dataURLtoBlob  = function (dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
    u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}

nuages.interactWithImplant  = function (implant) {
    if(nuages.vars.implants[implant]){
        nuages.vars.globalOptions.implant.value = implant;
        if(nuages.vars.moduleOptions && nuages.vars.moduleOptions.implant){
            nuages.vars.moduleOptions.implant.value = nuages.vars.implants[implant]._id;
        }
        if(nuages.vars.paths[implant] == undefined){
            nuages.vars.paths[implant] = ".";
        }
    }else{
        nuages.term.logError("Implant not found");
    }
}


nuages.exportToFile  = function (b64, fileName) {
    //const u8arr = new TextEncoder('utf-8').encode(JSON.stringify(jsonData, null, 2));
    const url = window.URL.createObjectURL(nuages.dataURLtoBlob("data:application/octet-stream;base64,"+b64));
    const element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', fileName);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

nuages.printLog  = function(log){
    if (log.type == 0){
        nuages.term.printInfo(log.message, log.sourceName);
    }else if(log.type == 1){
        nuages.term.printError(log.message, log.sourceName);
    }else{
        nuages.term.printSuccess(log.message, log.sourceName);
    }
}

nuages.printModRunPatched  = function (run){
        if (run.runStatus == 3){
            nuages.term.logSuccess("Module Completed Successfully", run.moduleName);
        }else if(run.runStatus == 4){
            nuages.term.logError("Module Failed", run.moduleName);
        }
}

nuages.printListenerPatched  = function (listener){
    if (listener.runStatus == 3){
        nuages.term.logSuccess("Listener Started", listener.handlerName);
    }else if(listener.runStatus == 4){
        nuages.term.logError("Listener Failed", listener.handlerName);
    }
    else if(listener.runStatus == 2){
        nuages.term.logError("Listener Stopped", listener.handlerName);
    }
}

nuages.createImplantInteractiveChannel = function(implant, filename, args = "") {
    if(nuages.vars.implants[implant]){
        nuages.createJobWithPipe(implant, 
            {type:"interactive", 
            options:{ 
                path: nuages.vars.paths[implant], 
                filename: filename,
                args: args
            }
            },
            {
                destination: filename,
                type:"interactive",
                source: "Nuages_Cli"
            }
            ).then((job)=>{
                if(job.pipe_id){
                   if(nuages.vars.implants[implant].os.toLowerCase() != "windows"){
                        nuages.vars.globalOptions.newlinemode.value = "Posix";
                    }
                    nuages.sleep(1000).then(()=>{
                        nuages.term.write("!channels " + job.pipe_id.substring(0,6) + " -i\r\n");
                    });
                }
            }).catch((err) => {
                nuages.term.logError(err.message);
            });
    
    }else{
        nuages.term.printError("Implant not found");
    }

};


nuages.interactWithPipe  = function (pipe_id,stdin,stdout){
    async function syncIO(nuages, pipe_id, input = undefined, stdout = process.stdout){
        try{
            if(input){
                if(input.toString()=="!switch\r\n"){
                    if(nuages.vars.globalOptions.newlinemode.value != "Windows"){
                        term.logInfo("Changing newlinemode to Windows");
                        nuages.vars.globalOptions.newlinemode.value = "Windows";
                    }else{
                        nuages.vars.globalOptions.newlinemode.value = "Posix";
                        term.logInfo("Changing newlinemode to Posix");
                    }
                    return;
                }
                if(input.toString()=="!background\r\n"){
                    stdin.removeAllListeners('data');
                    nuages.term = nuages.getTerm();
                    nuages.term.history = nuages.termHistoryBackup;
                    clearInterval(interval);
                    term.logInfo("Putting channel in the background");
                    nuages.channelMode = false;
                    nuages.term.setPromptline();
                    nuages.term.cprompt();
                    return;
                }
                if(nuages.vars.globalOptions.newlinemode.value != "Windows"){
                    if(input[input.length-1] == 0x0d){
                        input = input.slice(0, input.length - 1);
                        input[input.length-1] = 0x0a;
                    }
                }
                var data = await nuages.ioService.create({pipe_id:pipe_id,in:input.toString('base64')});
                let buff = Buffer.from(data.out, 'base64');
                stdout.write(buff);
                }else{
                    var data = await nuages.ioService.create({pipe_id:pipe_id});
                    let buff = Buffer.from(data.out, 'base64');
                    stdout.write(buff);
                }
        }catch(e){
            stdin.removeAllListeners('data');
            nuages.term = nuages.getTerm();
            nuages.term.history = nuages.termHistoryBackup;
            clearInterval(interval);
            term.logInfo("Lost connection to channel");
            nuages.channelMode = false;
            nuages.term.setPromptline();
            nuages.term.cprompt();
            return;
        }
    }
    nuages.term.printInfo("Type !background to background the channel");
    nuages.term.printInfo("Type !switch to switch newline mode");
    nuages.channelMode = true;
    nuages.termHistoryBackup = nuages.term.history;
    nuages.term.close();
    stdin.on('data', function(chunk) {syncIO(nuages,pipe_id,chunk,stdout) });
    var interval = setInterval(syncIO, nuages.vars.globalOptions.refreshrate.value, nuages, pipe_id, undefined, stdout);
}

nuages.chunkSubstr  = function (str, size) {
    const numChunks = Math.ceil(str.length / size)
    const chunks = new Array(numChunks)

    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substr(o, size)
    }

    return chunks
  }



nuages.jobService.on('patched', job => nuages.processJobPatched(job));
nuages.implantService.on('created', function(implant){nuages.vars.implants[implant._id.substring(0,6)] = implant; nuages.term.logInfo("New Implant:\r\n" + nuages.printImplants({imp: implant}));});
nuages.implantService.on('patched', function(implant){nuages.vars.implants[implant._id.substring(0,6)] = implant});
nuages.implantService.on('removed', function(implant){delete nuages.vars.implants[implant._id.substring(0,6)]; nuages.term.logInfo("Deleted Implant:\r\n" + nuages.printImplants({imp: implant}));});
nuages.modrunService.on('patched', function(run){nuages.printModRunPatched(run)});
nuages.logService.on('created', function(log){nuages.printLog(log)});
nuages.listenerService.on('patched', function(run){nuages.printListenerPatched(run)});
nuages.moduleService.on('created', function(mod){nuages.term.logInfo("Module loaded:\r\n" + nuages.printModules({mod: mod}));nuages.vars.modules[mod.name]=mod;});
nuages.handlerService.on('created', function(mod){nuages.term.logInfo("Handler loaded:\r\n" + nuages.printHandlers({mod: mod}));nuages.vars.handlers[mod.name]=mod;});
nuages.pipeService.on('created', function(mod){if(mod.type=="interactive"){nuages.term.logInfo("Channel created:\r\n" + nuages.printPipes({mod: mod}));}nuages.vars.pipes[mod._id.substring(0,6)]=mod;});
nuages.tunnelService.on('created', function(mod){nuages.term.logInfo("Tunnel created:\r\n" + nuages.printTunnels({mod: mod}));nuages.vars.tunnels[mod._id.substring(0,6)]=mod;});
exports.nuages = nuages;
