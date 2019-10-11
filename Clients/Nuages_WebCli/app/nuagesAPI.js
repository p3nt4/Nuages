const socket = io(window.location.protocol+ "//" + window.location.host);
const app = feathers();
app.configure(feathers.authentication({
    storage: window.localStorage
    }));
app.configure(feathers.socketio(socket));
const implantService = app.service('implants');
const jobService = app.service('jobs');
const fsService = app.service('fs');
const fileService = app.service('/fs/files');
const chunkService = app.service('/fs/chunks');
const modrunService = app.service('/modules/run');
const moduleService = app.service('/modules');
const modloadService = app.service('/modules/load');
fsService.timeout = 20000000;
chunkService.timeout = 20000000;

function makeid(length) { //Note made to be secure - just to differentiates sessions as we are only using one user
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}


async function login(user,password){
    try {
        await app.logout();
        vars.user = {email: user, password: password}
        const payload = Object.assign({ strategy: 'local' }, vars.user);
        await app.authenticate(payload);
        term.logSuccess("Authentication Successful", user.email);
        getImplants();
        getModules(false);
        vars.session = makeid(32);
    } catch(error) {
    // If we got an error, show the login page
        term.logError(error.message);
    }
}

function printImplants(imp){
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
            console.log(implant);
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

function humanFileSize(size) {
    if(size==0){
        return "0";
    }
    var i = Math.floor( Math.log(size) / Math.log(1024) );
    return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
};

function printFiles(files){
    var files = Object.values(files);
    if(files.length == 0 ){return "";}
    result = "\r\n ID     | Size      | ChunkSize | Uploaded By | Upload Date     | Name \r\n";
    result += "".padEnd(90,"-") + "\r\n";
    var file;
    var string = "";
    for (var i=0; i < files.length; i ++){
        try{
            file = files[i];
            console.log(file);
            string = "";
            var uploadedBy = file.metadata.uploadedBy ? file.metadata.uploadedBy.substring(0,6) : "";
            string += " " + file._id.toString().substring(0,6).padEnd(7, ' ') + "| ";
            string += humanFileSize(Math.floor(file.length*3/4)).padEnd(10, ' ') + "| ";
            string += file.chunkSize.toString().substring(0,9).padEnd(10, ' ') + "| ";
            string += " " + uploadedBy.padEnd(11, ' ') + "| ";
            string += new Date(file.uploadDate).toLocaleDateString('en-GB', {day : 'numeric', month : 'numeric', hour: 'numeric', minute: "numeric", second: "numeric"}) + " | ";
            string += file.filename.substring(0,30)+"\r\n";
            result+=string;
        }catch(e){
            console.log(e);
        };
    }
    return result;
}

function printModules(modules){
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
            string += " " + mod.description.substring(0,term._core.cols-string.length)+"\r\n";
            result+=string;
        }catch(e){
            console.log(e);
        };
    }
    return result;
}

function printJobs(jobs){
    console.log(jobs);
    const statusCodes = ["Pending  ", "Received ", "Running  ", term.toGreen("Success  "), term.toRed("Failed   ")];
    var jobs = Object.values(jobs);
    if(jobs.length == 0 ){return;}
    result = "\r\n Implant | ID     | Status   | Updated  |  Type      | Options                   | Result \r\n";
    result += "".padEnd(term._core.cols-1,"-") + "\r\n";
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
            string += new Date(job.lastUpdated).toLocaleDateString('en-GB', {day : 'numeric', month : 'numeric', hour: 'numeric', minute: "numeric", second: "numeric"}).substring(7,16) + " | ";
            string += " " + job.payload.type.toString().substring(0,9).padEnd(10, ' ')+"|";
            string += " " + dispOption.substring(0,25).padEnd(26, ' ')+"|";
            string += " " + job.result.replace(/\n|\r/g, "").substring(0,term._core.cols-85)+"\r\n";
            result += string;
        }catch(e){
            console.error(e);
        }
    }
    return result;
}

function printOptions(){
    string = "\r\n ["+term.toBold(term.toBlue("Global"))+"]"
    string += "\r\n Name          | Value          \r\n"
    string += "".padEnd(60,"-") + "\r\n";
    string += " Implant       | " + vars.globalOptions.implant.toString() +"\r\n";
    string += " Chunk Size    | " + vars.globalOptions.chunksize.toString() +"\r\n";
    string += " Timeout (min) | " + vars.globalOptions.timeout.toString() +"\r\n";
    //string += " Path          | " + vars.globalOptions.path;
    term.writeln(string);
    if(vars.modules[vars.module]!=undefined){
        string = "\r\n ["+term.toBold(term.toMagenta("Module"))+"]"
        string += "\r\n Name             | Required |   Value                                  | Description \r\n"
        string += "".padEnd(100,"-") + "\r\n";
        var optionKeys = Object.keys(vars.moduleOptions);
        for(var i = 0; i < optionKeys.length; i++){
            string += " " +optionKeys[i].substr(0,16).padEnd(17," ")+"| " + vars.moduleOptions[optionKeys[i]].required.toString().padEnd(9," ")+"| " + vars.moduleOptions[optionKeys[i]].value.substr(0,40).padEnd(41," ")+"| " + vars.moduleOptions[optionKeys[i]].description + "\r\n";
        }
        term.writeln(string);	
    }
}

async function getImplants(){
    vars.implants = {};
    implantService.find({query: {$limit: 200}}).then(items => {
        for(var i = 0; i< items.data.length; i++){
            vars.implants[items.data[i]._id.substring(0,6)] = items.data[i]
        }; 
            term.logInfo("Implants:\r\n" + printImplants(items.data)); 
        }).catch((err) => {
            term.logError(err.message);
        });
    
}

async function getModules(print = true){
    vars.modules = {};
    moduleService.find({query: {$limit: 200}}).then(items => {
        for(var i = 0; i< items.data.length; i++){
            vars.modules[items.data[i].name] = items.data[i]
        }; 
            if(print){
                term.logInfo("Modules:\r\n" + printModules(items.data)); 
            }
        }).catch((err) => {
            term.logError(err.message);
        });
}

async function getFiles(){
    vars.files = {};
    try{
        items = await fileService.find({query: {$limit: 200}});
        }catch(e){term.printError(e);}
    for(var i = 0; i< items.data.length; i++){
        vars.files[items.data[i]._id.substring(0,6)] = items.data[i]
    };
    term.logInfo("Files:\r\n" + printFiles(items.data)); 
}

async function getJobs(){
    try{
        items = await jobService.find({query: {$limit: 15, $sort: { lastUpdated: -1 }}});
        }catch(e){term.printError(e);}
    for(var i = 0; i< items.data.length; i++){
        vars.jobs[items.data[i]._id.substring(0,6)] = items.data[i]
    };
    term.logInfo("Jobs:\r\n" + printJobs(items.data)); 
}

function createJob(implant, payload){
    console.log(payload);
    var timeout = Date.now() + parseInt(vars.globalOptions.timeout) * 60000;
    if (vars.implants[implant] != undefined){
        jobService.create({
            implantId: vars.implants[implant]._id,
            timeout: timeout,
            vars: {session: vars.session},
            payload: payload}
            ).catch((err) => {
                term.logError(err.message);
            });
    }else{
        //term.logError("Implant not found: !setg implant <ID> or !shell <ID>");
    }
}

function processJobPatched(job){
    //console.log(job);
    if(job.vars.session === undefined || job.vars.session != vars.session){
        return;
    }

    if(job.moduleRun !== undefined){
        return;
    }
    if(job.payload.type=="Command" && job.payload.options.cd == true && job.result){
        vars.globalOptions.path = job.result.trim();	        if(job.result.split('\n').length > 3){
        vars.paths[job.implantId.substring(0,6)] = job.result.split('\n')[2].trim();
        term.reprompt();
        }else{
            term.logError("Path not found");
        }
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

term.printError = function(e){
    term.write("\r\n [\u001b[31m\u001b[1mError\u001b[39m\u001b[22m] "); 
    term.writeln(e.message);
    term.prompt();
}

function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
    u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}

function exportToFile(b64, fileName) {
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

function printModRunLog(modRun){
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

function printHelp(){
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
    string += " !files                                  - List files\r\n";
    string += " !files upload                           - Upload a file from the local client\r\n";
    string += " !files <id> download                    - Download a file to the local client\r\n";
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

function chunkSubstr(str, size) {
    const numChunks = Math.ceil(str.length / size)
    const chunks = new Array(numChunks)

    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substr(o, size)
    }

    return chunks
  }

function loadFile() {
    var file    = document.querySelector('input[type=file]').files[0];
    var reader  = new FileReader();
    reader.addEventListener("load", function () {
        var chunks = chunkSubstr(reader.result.split(',')[1],parseInt(vars.globalOptions.chunksize));
        fileService.create({filename: file.name, chunkSize: parseInt(vars.globalOptions.chunksize) , length: 0, metadata:{path:"N/A"}}).then(function(file){
            var promises = [];
            for (var i=0; i < chunks.length; i++){
                promises.push(chunkService.create({files_id: file._id, n: i, data:chunks[i]}));
            }
            Promise.all(promises).then(function(){
                fsService.patch(file._id,{}).catch((err) => {
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


jobService.on('patched', job => processJobPatched(job));
implantService.on('created', function(implant){vars.implants[implant._id.substring(0,6)] = implant; term.logInfo("New Implant:\r\n" + printImplants({imp: implant}));});
implantService.on('patched', function(implant){vars.implants[implant._id.substring(0,6)] = implant});
implantService.on('removed', function(implant){delete vars.implants[implant._id.substring(0,6)]; term.logInfo("Deleted Implant:\r\n" + printImplants({imp: implant}));});
fsService.on('patched', function(file){vars.files[file._id.substring(0,6)] = file; if(file.complete){ term.logInfo("New File:\r\n" + printFiles({imp: file}));}});
fsService.on('removed', function(file){term.logInfo("Deleted file:\r\n" + printFiles({imp: vars.files[file.id.substring(0,6)]}));delete vars.files[file.id.substring(0,6)];});
modrunService.on('patched', function(run){printModRunLog(run)});
moduleService.on('created', function(mod){term.logInfo("Module loaded:\r\n" + printModules({mod: mod}));vars.modules[mod.name]=mod;});
//moduleService.on('created', function(mod){printModules({mod: mod})});
