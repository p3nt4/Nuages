const socket = io(window.location.protocol+ "//" + window.location.host);
const app = feathers();
app.configure(feathers.authentication({
    storage: window.localStorage
    }));
app.configure(feathers.socketio(socket));
var nuages = {};

nuages.implantService = app.service('implants');
nuages.jobService = app.service('jobs');
nuages.fsService = app.service('fs');
nuages.fileService = app.service('/fs/files');
nuages.chunkService = app.service('/fs/chunks');
nuages.modrunService = app.service('/modules/run');
nuages.moduleService = app.service('/modules');
nuages.modloadService = app.service('/modules/load');
nuages.handlerService = app.service('/handlers');
nuages.listenerService = app.service('/listeners');
nuages.listenerStartService = app.service('/listeners/startstop');
nuages.handloadService = app.service('/handlers/load');
nuages.fsService.timeout = 20000000;
nuages.chunkService.timeout = 20000000;



nuages.vars = { 
    implants: {},
    paths:{},
    files: {},
    modules: {},
    handlers: {},
    jobs: {},
    listeners: {},
    module: ""
};

nuages.vars.globalOptions = {
        implant: 0,
        //path : ".",
        chunksize: 2400000,
        timeout: "1",
};
    
nuages.vars.moduleOptions = {};

nuages.printHelp = function(){
    var string = "\r\n";
    string += " !login <username>                       - Login to Nuages\r\n" ;
    string += " !implants                               - List implants\r\n";
    string += " !implants <id>                          - Show an implant\r\n";
    string += " !implants <id> del                      - Delete an implant\r\n";
    string += " !implants <id> kill                     - Kill an implant\r\n";
    string += " !implants <id> config                   - Get the configuration from the implant\r\n";
    string += " !implants <id> config <option> <value>  - Reconfigure the implant\r\n";
    string += " !implants all [Command..]               - Apply the command to all implants\r\n";
    string += " !implant [Command..]                    - Apply the command to the current implant\r\n";
    string += " !shell <implant>                        - Start interracting with an implant\r\n" ;
    string += " !put <fileId> [path]                    - Start a download job on the current implant\r\n";
    string += " !get <path>                             - Start an upload job on the current implant\r\n";
    string += " cd <path>                               - Change path on the current implant\r\n";
    string += " !files                                  - List files\r\n";
    string += " !files upload <path>                    - Upload a file from the local client\r\n";
    string += " !files <id> download <path>             - Download a file to the local client\r\n";
    string += " !files <id> del                         - Delete a file\r\n";
    string += " !options                                - Show options\r\n" ;
    string += " !setg <option> <value>                  - Set a global option\r\n" ;
    string += " !unsetg <option>                        - Unset a global option\r\n" ;
    string += " !set <option> <value>                   - Set a module option\r\n" ;
    string += " !unset <option>                         - Unset a module option\r\n" ;
    string += " !use <path>                             - Select a module or handler\r\n";
    string += " !modules load <path>                    - Load a module\r\n";
    string += " !modules <path> del                     - Delete a module\r\n";
    string += " !run                                    - Run the module or handler\r\n";
    string += " !autorun                                - Autorun the module on new implants\r\n";
    string += " !autoruns                               - List module autoruns\r\n";
    string += " !autoruns clear                         - Clear module autoruns\r\n";
    string += " !handlers                               - List available handlers\r\n";
    string += " !listeners                              - List active handlers\r\n";
    string += " !listeners <id>                         - Show listener details\r\n";
    string += " !listeners <id> start                   - Start listener\r\n";
    string += " !listeners <id> stop                    - Stop listener\r\n";
    string += " !listeners <id> del                     - Delete listener\r\n";
    string += " !jobs                                   - Display the last jobs\r\n";
    string += " !jobs <id>                              - Display a job and its result\r\n";
    string += " !jobs <id> save <path>                  - Save the job result to the local client\r\n";
    string += " !jobs search <command>                  - Search jobs by command\r\n";
    string += " !help                                   - Print this message\r\n";
    term.printInfo(string, "Help")
}

nuages.loadFile= function() {
    var file    = document.querySelector('input[type=file]').files[0];
    var reader  = new FileReader();
    reader.addEventListener("load", function () {
        var chunks = nuages.chunkSubstr(reader.result.split(',')[1],parseInt(nuages.vars.globalOptions.chunksize));
        nuages.fileService.create({filename: file.name, chunkSize: parseInt(nuages.vars.globalOptions.chunksize) , length: 0, metadata:{path:"N/A"}}).then(function(file){
            var promises = [];
            for (var i=0; i < chunks.length; i++){
                promises.push(nuages.chunkService.create({files_id: file._id, n: i, data:chunks[i]}));
            }
            Promise.all(promises).then(function(){
                nuages.fsService.patch(file._id,{}).catch((err) => {
                    term.logError(err.message);
                });	
            });
        }).catch((err) => {
                    term.logError(err.message);
                });
    }, false);

    if (file) {
        reader.readAsDataURL(file);
    }
}

nuages.downloadFile= function(fileId) {
    nuages.fileService.get(nuages.vars.files[fileId]._id).then( function(result) {
        var arraySize = Math.floor(result.length/result.chunkSize);
        if (result.length != arraySize * result.chunkSize){
            arraySize++;
        }
        var chunks = new Array(arraySize);
        var promises = new Array(arraySize);
        for(var i = 0; i < arraySize; i ++){
            promises.push(nuages.chunkService.find({query: {
                n: i,
                files_id: nuages.vars.files[cmdArray[1]]._id
                }}).then( function(result) {
                    chunks[result.data[0].n]=result.data[0].data;
                }));
        }
        Promise.all(promises).then( function(result) {
                    link = document.getElementById("DL");
                    var redirectWindow = window.open('');
                    nuages.exportToFile(chunks.join(""), nuages.vars.files[cmdArray[1]].filename);									
                });
    });
}

nuages.saveTextToFile= function(text,filename) {
    link = document.getElementById("DL");
    var redirectWindow = window.open('');
    nuages.exportToFile(btoa(text), filename);	
}



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
         term.logSuccess("Authentication Successful", user.email);
         nuages.getImplants();
         nuages.getModules(false);
         nuages.getHandlers(false);
         nuages.getFiles(false);
         nuages.getListeners(false);
         nuages.vars.session = makeid(32);
     } catch(error) {
     // If we got an error, show the login page
         term.logError(error.message);
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
         
         var final = new Date(timestamp).toLocaleDateString('en-GB', {day : 'numeric', month : 'numeric', hour: 'numeric', minute: "numeric", second: "numeric"});
         if (daysDifference > 1) {return (term.toBold(term.toRed(final)));}
         if (minutesDifference <= 5 && hoursDifference < 1) {return (term.toBold(term.toGreen(final)));}
         return final;
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
             string += nuages.formatImplantLastSeen(implant.lastSeen);
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
 
 nuages.printHandlers = function(modules){
     var modules = Object.values(modules);
     if(modules.length == 0 ){return "";}
     result = "\r\n Name                                              | Description \r\n";
     result += "".padEnd(90,"-") + "\r\n";
     var string = "";
     for (var i=0; i < modules.length; i ++){
         try{
             mod = modules[i];
             string = "";
             string += " " + mod.name.substring(0,50).padEnd(50, ' ') + "|";
             string += " " + mod.description.substring(0,60)+"\r\n";
             result+=string;
         }catch(e){
         };
     }
     return result;
 }
 
 nuages.printListeners = function(modules){
     var modules = Object.values(modules);
     if(modules.length == 0 ){return "";}
     result = "\r\n ID    | Type                                              | PID     | Status    \r\n";
     result += "".padEnd(90,"-") + "\r\n";
     var string = "";
     var statusCodes = ["","Submitted", term.toRed("Stopped"), term.toGreen("Running"), term.toRed("Failed")]
     for (var i=0; i < modules.length; i ++){
         try{
             mod = modules[i];
             string = "";
             string += mod._id.toString().substring(0,6) + " |";
             string += " " + mod.handlerName.substring(0,50).padEnd(50, ' ') + "|";
             if(mod.pid){
                 string+= " " + mod.pid.toString().padEnd(8) + "|"
             }else{
                 string+= " ".padEnd(8) + "|"
             }
             string+= " " + statusCodes[mod.runStatus].padEnd(14, ' ') + "\r\n"
             result+=string;
         }catch(e){
             console.log(e);
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
     term.writeln(string);
     if(nuages.vars.modules[nuages.vars.module]!=undefined || nuages.vars.handlers[nuages.vars.module]!=undefined){
         nuages.printModuleOptions();
     }
 }
 
 nuages.printModuleOptions = function(moduletype = nuages.vars.moduletype, options = nuages.vars.moduleOptions){
     if(moduletype == "module"){
         string = "\r\n ["+term.toBold(term.toMagenta("Module"))+"]"
     }else{string = "\r\n ["+term.toBold(term.toYellow("Handler"))+"]"}
     string += "\r\n Name             | Required |   Value                                  | Description \r\n"
     string += "".padEnd(100,"-") + "\r\n";
     var optionKeys = Object.keys(options);
     for(var i = 0; i < optionKeys.length; i++){
         string += " " +optionKeys[i].substr(0,16).padEnd(17," ")+"| " + options[optionKeys[i]].required.toString().padEnd(9," ")+"| " + options[optionKeys[i]].value.substr(0,40).padEnd(41," ")+"| " + options[optionKeys[i]].description + "\r\n";
     }
     term.writeln(string);	
     
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
                 term.logInfo("Modules:\r\n" + nuages.printHandlers(items.data)); 
             }
         }).catch((err) => {
             term.logError(err.message);
         });
 }
 
 nuages.getHandlers = function(print = true){
     nuages.vars.handlers = {};
     nuages.handlerService.find({query: {$limit: 200}}).then(items => {
         for(var i = 0; i< items.data.length; i++){
             nuages.vars.handlers[items.data[i].name] = items.data[i]
         }; 
             if(print){
                 term.logInfo("Handlers:\r\n" + nuages.printHandlers(items.data)); 
             }
         }).catch((err) => {
             term.logError(err.message);
         });
 }
 
 nuages.getListeners = function(print = true){
     nuages.vars.listeners = {};
     nuages.listenerService.find({query: {$limit: 200}}).then(items => {
         for(var i = 0; i< items.data.length; i++){
             nuages.vars.listeners[items.data[i]._id.substring(0,6)] = items.data[i]
         }; 
             if(print){
                 term.logInfo("Listeners:\r\n" + nuages.printListeners(items.data)); 
             }
         }).catch((err) => {
             term.logError(err.message);
         });
 }
 
 nuages.getFiles = async function(print = true){
     nuages.vars.files = {};
     try{
         items = await nuages.fileService.find({query: {$limit: 200}});
         }catch(e){term.printError(e); return}
     for(var i = 0; i< items.data.length; i++){
         nuages.vars.files[items.data[i]._id.substring(0,6)] = items.data[i]
     };
     if(print){
         term.logInfo("Files:\r\n" + nuages.printFiles(items.data)); 
     }
 }
 
 nuages.getAutoruns = async function(){
     try{
         items = await nuages.modrunService.find({query: {autorun: true}});
         }catch(e){term.printError(e); return}
     var str = "";
     for(var i=0; i< items.data.length; i++){
         str += items.data[i].moduleName +"\r\n";
     }
     term.logInfo("Autoruns:\r\n" + str); 
 }
 
 nuages.clearAutoruns = async function(){
     try{
         autoruns = await nuages.modrunService.find({query: {autorun: true}});
         }catch(e){term.printError(e); return}
     for(var i=0; i< autoruns.data.length; i++){
         nuages.modrunService.remove(autoruns.data[i]._id).then(item => {
                 term.logInfo("Deleted Autorun: " + item.moduleName); 
         }).catch((err) => {
                 term.logError(err.message);
             });;
     }
 }
 
 nuages.clearImplants = async function(){
     try{
         implants = await nuages.implantService.find();
         }catch(e){term.printError(e); return}
     for(var i=0; i< implants.data.length; i++){
         nuages.implantService.remove(implants.data[i]._id).then(item => {}).catch((err) => {
                 term.logError(err.message);
             });;
     }
 }
 
 nuages.getJobs = async function(query){
     try{
         if(query == undefined){
            items = await nuages.jobService.find({query: {$limit: 20, $sort: { lastUpdated: -1 }}});
         }else{
            items = await nuages.jobService.find({query: {$limit: 20, $sort: { lastUpdated: -1 }, "payload.options.cmd": query}});
         }
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
 
 nuages.createJobWithUpload = function (implant, payload, filename){
     var timeout = Date.now() + parseInt(nuages.vars.globalOptions.timeout) * 60000;
     var chunkSize = parseInt(nuages.vars.globalOptions.chunksize);
     if (nuages.vars.implants[implant] != undefined){
         nuages.jobService.create({
             implantId: nuages.vars.implants[implant]._id,
             timeout: timeout,
             vars: {session: nuages.vars.session},
             fileUpload: true,
             chunkSize: chunkSize,
             fileName: filename,
             payload: payload}
             ).catch((err) => {
                 term.logError(err.message);
             });
     }else{
         //term.logError("Implant not found: !setg implant <ID> or !shell <ID>");
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
             term.logError("Path not found");
         }
         term.reprompt();
     }else if(job.payload.type=="cd" && job.jobStatus == 3 && job.result){
         nuages.vars.paths[job.implantId.substring(0,6)] = job.result;
         term.reprompt();
     }
     else if(job.jobStatus == 4){
         if(job.payload.type=="command"){
             term.logError("Failed command: " + job.payload.options.cmd +"\r\n" + job.result, job.implantId.substring(0,6));
         }else{
             term.logError(job.payload.type + " failed:\r\n " + job.result, job.implantId.substring(0,6));
         }
     }
     else if(job.jobStatus == 3){
         if(job.payload.type=="command"){
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
     const url = window.URL.createObjectURL(nuages.dataURLtoBlob("data:application/octet-stream;base64,"+b64));
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
 
 nuages.printListenerLog  = function (modRun){
     if(modRun.log.length > 0){
         var logEntry = modRun.log[modRun.log.length - 1];
         if (logEntry.type == 0){
             term.logInfo(logEntry.message, modRun.handlerName);
         }else if(logEntry.type == 1){
             term.logError(logEntry.message, modRun.handlerName);
         }else{
             term.logSuccess(logEntry.message, modRun.handlerName);
         }
             
     }
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
 nuages.implantService.on('created', function(implant){nuages.vars.implants[implant._id.substring(0,6)] = implant; term.logInfo("New Implant:\r\n" + nuages.printImplants({imp: implant}));});
 nuages.implantService.on('patched', function(implant){nuages.vars.implants[implant._id.substring(0,6)] = implant});
 nuages.implantService.on('removed', function(implant){delete nuages.vars.implants[implant._id.substring(0,6)]; term.logInfo("Deleted Implant:\r\n" + nuages.printImplants({imp: implant}));});
 nuages.fsService.on('patched', function(file){nuages.vars.files[file._id.substring(0,6)] = file; if(file.complete){term.logInfo("New File:\r\n" + nuages.printFiles({imp: file}));}});
 nuages.fsService.on('removed', function(file){term.logInfo("Deleted file:\r\n" + nuages.printFiles({imp: nuages.vars.files[file.id.substring(0,6)]}));delete nuages.vars.files[file.id.substring(0,6)];});
 nuages.modrunService.on('patched', function(run){nuages.printModRunLog(run)});
 nuages.listenerService.on('patched', function(run){nuages.printListenerLog(run)});
 nuages.moduleService.on('created', function(mod){term.logInfo("Module loaded:\r\n" + nuages.printModules({mod: mod}));nuages.vars.modules[mod.name]=mod;});
 nuages.handlerService.on('created', function(mod){term.logInfo("Handler loaded:\r\n" + nuages.printHandlers({mod: mod}));nuages.vars.handlers[mod.name]=mod;});
 