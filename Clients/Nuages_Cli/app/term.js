var rl = require('readline'); 

function getTerm(){
    function completer(line) {
        words = line.split(" ");
        var targetWord = words[words.length-1];
        if((words[0].toLowerCase() == "!shell" || words[0].toLowerCase() == "!implants" ) && words.length == 2){
            var completions = Object.keys(nuages.vars.implants);
            completions.push("all");
        }
        else if(words[0].toLowerCase() == "!implants" && words.length == 3){
            var completions = 'config del kill'.split(' ');
        }
        else if(words[0].toLowerCase() == "!channels" && words.length == 3){
            var completions = 'del interact'.split(' ');
        }
        else if(words[0].toLowerCase() == "!tunnels" && words.length == 3){
            var completions = 'del'.split(' ');
        }
        else if((words[0].toLowerCase() == "!files" || words[0].toLowerCase() == "!put")&& words.length == 2){
            var completions = Object.keys(nuages.vars.files);
            if(words[0].toLowerCase() == "!files"){completions.push("upload");}
        }else if(words[0].toLowerCase() == "!files" && words.length == 3){
            var completions = 'download del'.split(' ');
        }else if((words[0].toLowerCase() == "!setg" || words[0].toLowerCase() == "!set" ) && words.length == 3){
            if(words[1].toLowerCase() == "implant"){var completions = Object.keys(nuages.vars.implants);}
            else if(words[1].toLowerCase() == "file"){var completions = Object.keys(nuages.vars.files);}
            else {var completions = [];}
        }
        else if((words[0].toLowerCase() == "!setg" || words[0].toLowerCase() == "!unsetg") && words.length == 2){
            var completions = Object.keys(nuages.vars.globalOptions);
        }
        else if((words[0].toLowerCase() == "!set" || words[0].toLowerCase() == "!unset") && words.length == 2){
            if(nuages.vars.modules[nuages.vars.module] || nuages.vars.handlers[nuages.vars.module]){
                var completions = Object.keys(nuages.vars.moduleOptions);
            }else{
                var completions = [];
            }
        }
        else if((words[0].toLowerCase() == "!modules") && words.length == 2){
            var completions = Object.keys(nuages.vars.modules)
            completions.push("load");
        }
        else if((words[0].toLowerCase() == "!handlers") && words.length == 2){
            var completions = Object.keys(nuages.vars.handlers)
            completions.push("load");
        }
        else if((words[0].toLowerCase() == "!listeners") && words.length == 2){
            var completions = Object.keys(nuages.vars.listeners);
        }
        else if((words[0].toLowerCase() == "!channels") && words.length == 2){
            var completions = Object.keys(nuages.vars.pipes);
        }
        else if((words[0].toLowerCase() == "!tunnels") && words.length == 2){
            var completions = Object.keys(nuages.vars.tunnels);
            completions.push("socks");
            completions.push("tcp");
        }
        else if((words[0].toLowerCase() == "!use") && words.length == 2){
            var completions = Object.keys(nuages.vars.modules).concat(Object.keys(nuages.vars.handlers));
        }
        else if((words[0].toLowerCase() == "!modules" || words[0].toLowerCase() == "!handlers" ) && words.length == 3){
            var completions = 'del'.split(' ');
        }
        else if((words[0].toLowerCase() == "!listeners") && words.length == 3){
            var completions = 'del start stop'.split(' ');
        }
        else if((words[0].toLowerCase() == "!jobs") && words.length == 2){
            var completions = Object.keys(nuages.vars.jobs);
            completions.push("search");
        }
        else if((words[0].toLowerCase() == "!jobs") && words.length == 3 && (words[1].toLowerCase() != "search")){
            var completions = 'save'.split(' ');
        }
        else if((words[0].toLowerCase() == "!autoruns") && words.length == 2){
            var completions = 'clear'.split(' ');
        }
        else if(words.length==1){ 
            var completions = '!login !implant !implants !shell !put !get !files !options !setg !unsetg !set !unset !modules !use !run !autorun !autoruns !jobs !handlers !listeners !channels !tunnels !interactive !back !help'.split(' ');
        }else{
        return[[],line];
        }       
        var hits = completions.filter((c) => c.startsWith(targetWord));
        return [hits && hits.length ? hits : completions, targetWord];
    }

    var term = rl.createInterface({ input: process.stdin, output: process.stdout, completer});

    //term.on("SIGINT", function () {
    //    process.emit("SIGINT");
    // });

    term.stdoutMuted = false;

    term._writeToOutput = function _writeToOutput(stringToWrite) {
        if (term.stdoutMuted)
        term.output.write("");
        else
        term.output.write(stringToWrite);
    };

    //term.setPrompt("|Nuages>");  

    term.toRed = (text) => {
        return "\u001b[31m"+text+"\u001b[39m";
    };

    term.reprompt = ()=>{
        term.setPromptline();
        term.lastPrint = false;
        term.prompt(true);
    }
    term.cprompt = ()=>{
        term.lastPrint = false;
        term.prompt(true);
    }
    term.toGreen = (text) => {
        return "\u001b[32m"+text+"\u001b[39m";
    };

    term.toBlue = (text) => {
        return "\u001b[34m"+text+"\u001b[39m";
    };

    term.toCyan = (text) => {
        return "\u001b[36m"+text+"\u001b[39m";
    };

    term.toMagenta = (text) => {
        return "\u001b[35m"+text+"\u001b[39m";
    };

    term.toYellow = (text) => {
        return "\u001b[33m"+text+"\u001b[39m";
    };

    term.toBold = (text) => {
        return "\u001b[1m"+text+"\u001b[22m";
    };

    term.logError = (text, special) => {
        var special = special ? special : "Error";
        if(!term.lastPrint){
            console.log();
        }
        term.writeln(" ["+term.toBold(term.toRed(special)) + "] " + text);
        term.cprompt();
    };

    term.logInfo = (text, special) => {
        var special = special ? special : "Info";
        if(!term.lastPrint){
            console.log();
        }
        term.writeln(" ["+term.toBold(term.toBlue(special)) + "] " + text);
        term.cprompt();
    };

    term.logSuccess = (text, special) => {
        var special = special ? special : "Success";
        if(!term.lastPrint){
            console.log();
        }
        term.writeln(" ["+term.toBold(term.toGreen(special)) + "] " + text);
        term.cprompt();
    };
    term.printError = (text, special) => {
        var special = special ? special : "Error";
        if(!term.lastPrint){
            console.log();
        }
        term.lastPrint = true;
        term.writeln(" ["+term.toBold(term.toRed(special)) + "] " + text);
    };

    term.printInfo = (text, special) => {
        var special = special ? special : "Info";
        if(!term.lastPrint){
            console.log();
        }
        term.lastPrint = true;
        term.writeln(" ["+term.toBold(term.toBlue(special)) + "] " + text);
    };

    term.printSuccess = (text, special) => {
        var special = special ? special : "Success";
        if(!term.lastPrint){
            console.log();
        }
        term.lastPrint = true;
        term.writeln(" ["+term.toBold(term.toGreen(special)) + "] " + text);
    };


    term.setPromptline = function(){
        if (term.passwordMode){
            console.log("Password: ");
            term.cpromptline = "";
            term.cpromptLength = term.cpromptline.length;
            term.setPrompt(term.cpromptline);
            term.stdoutMuted = true;
            return;
        }
        if (term.channelMode){
            term.cpromptline = "";
            term.cpromptLength = term.cpromptline.length;
            term.setPrompt(term.cpromptline);
            return;
        }
        term.stdoutMuted = false;
        var imp = nuages.vars.implants[nuages.vars.globalOptions.implant.value];
        var mod = nuages.vars.modules[nuages.vars.module];
        var handler = nuages.vars.handlers[nuages.vars.module];
        var path = nuages.vars.paths[nuages.vars.globalOptions.implant.value];
        term.cpromptline = "";
        var n = 0;
        if(imp){
            term.cpromptline += "["+term.toBold(term.toBlue(nuages.vars.globalOptions.implant.value))+"]";
            n += 40;
        }
        if (mod){
            term.cpromptline += "(" + term.toBold(term.toMagenta(mod.name)) + ")";
            n += 20;
        }
        if (handler){
            term.cpromptline += "(" + term.toBold(term.toYellow(handler.name)) + ")";
            n += 20;
        }
        if(imp){
            term.cpromptline += term.toRed(imp.username) + "@" + term.toRed(imp.hostname) + ": "+ path;
            n += 40;
        }else if(!mod && !handler) {
            term.cpromptline += "|"+term.toBold(term.toBlue('Nuages'));
            n += 20;
        }
        term.cpromptline += "> "
        term.setPrompt(term.cpromptline);
        term.cpromptLength = term.cpromptline.length - n;
    }

    term.setBufferLocation = function(x,y){
        term.moveBuffer(x-term._core.buffer.x,y-term._core.buffer.y);
    };

    term.writeln = function(text){
        console.log(text);
    }

    term.historySize = 50;

    term.removeHistoryDuplicates = true;

    return term;
};
//term.cprompt = function(){};
exports.getTerm = getTerm;