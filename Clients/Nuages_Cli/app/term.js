var rl = require('readline'); 

var term = rl.createInterface({ input: process.stdin, output: process.stdout});

term.stdoutMuted = false;

term._writeToOutput = function _writeToOutput(stringToWrite) {
    if (term.stdoutMuted)
    term.output.write("");
    else
    term.output.write(stringToWrite);
  };

term.setPrompt("|Nuages>");  

term.toRed = (text) => {
    return "\u001b[31m"+text+"\u001b[39m";
};

term.reprompt = ()=>{
    term.prompt();
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

term.toBold = (text) => {
    return "\u001b[1m"+text+"\u001b[22m";
};

term.logError = (text, special) => {
    var special = special ? special : "Error"
    term.writeln("\r\n ["+term.toBold(term.toRed(special)) + "] " + text);
    term.prompt();
};

term.logInfo = (text, special) => {
    var special = special ? special : "Info"
    term.writeln("\r\n ["+term.toBold(term.toBlue(special)) + "] " + text);
    term.prompt();
};

term.logSuccess = (text, special) => {
    var special = special ? special : "Success"
    term.writeln("\r\n ["+term.toBold(term.toGreen(special)) + "] " + text);
    term.prompt();
};
term.printError = (text, special) => {
    var special = special ? special : "Error"
    term.writeln("\r\n ["+term.toBold(term.toRed(special)) + "] " + text);
};

term.printInfo = (text, special) => {
    var special = special ? special : "Info"
    term.writeln("\r\n ["+term.toBold(term.toBlue(special)) + "] " + text);
};

term.printSuccess = (text, special) => {
    var special = special ? special : "Success"
    term.writeln("\r\n ["+term.toBold(term.toGreen(special)) + "] " + text);
};

term.setPromptline = function(){
    if (term.passwordMode){
        console.log("Password: ")
        term.promptline = ""
        term.promptLength = term.promptline.length;
        term.setPrompt(term.promptline);
        term.stdoutMuted = true;
        return;
    }
    term.stdoutMuted = false;
    var imp = nuages.vars.implants[nuages.vars.globalOptions.implant];
    var mod = nuages.vars.modules[nuages.vars.module];
    term.promptline = "";
    var n = 0;
    if(imp){
        term.promptline += "["+term.toBold(term.toBlue(nuages.vars.globalOptions.implant))+"]";
        n += 40;
    }
    if (mod){
        term.promptline += "(" + term.toBold(term.toMagenta(mod.name)) + ")"
        n += 20;
    }
    if(imp){
        term.promptline += term.toRed(imp.username) + "@" + term.toRed(imp.hostname) + ": "+ nuages.vars.globalOptions.path;
        n += 40;
    }else if(!mod) {
        term.promptline += "|"+term.toBold(term.toBlue('Nuages'));
        n += 20;
    }
    term.promptline += "> "
    term.setPrompt(term.promptline);
    term.promptLength = term.promptline.length - n;
}

term.setBufferLocation = function(x,y){
    term.moveBuffer(x-term._core.buffer.x,y-term._core.buffer.y);
};

term.writeln = function(text){
    console.log(text);
}

//term.prompt = function(){};

exports.term = term;