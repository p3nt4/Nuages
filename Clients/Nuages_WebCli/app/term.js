Terminal.applyAddon(fit);
var term = new Terminal({cursorBlink: true});
term.open(document.getElementById('terminal'));
term.fit();
term.setOption('theme', { 	
    background: '#2b303b',
    foreground: '#c0c5ce',
    cursor: '#c0c5ce',
    black: '#2b303b',
    red: '#bf616a',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    blue: '#4175a8',
    magenta: '#6c71c4',
    cyan: '#96b5b4',
    white: '#c0c5ce',
    brightBblack: '#65737e',
    brightRed: '#bf616a',
    brightGreen: '#9cc37b',
    brightYellow: '#ebcb8b',
    brightBlue: '#4175a8',
    brightMagenta: '#6c71c4',
    brightCyan: '#96b5b4',
    brightWhite: '#eff1f5',
});
window.addEventListener('resize', function(event){
    term.fit();
});
function runFakeTerminal() {
if (term._initialized) {
    return;
}

term._initialized = true;

term.toRed = (text) => {
    return "\u001b[31m"+text+"\u001b[39m";
};

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
        term.promptline = "Password: "
        term.promptLength = term.promptline.length;
        return;
    }
    var imp = vars.implants[vars.globalOptions.implant];
    var mod = vars.modules[vars.module];
    term.promptline = "";
    var n = 0;
    if(imp){
        term.promptline += "["+term.toBold(term.toBlue(vars.globalOptions.implant))+"]";
        n += 40;
    }
    if (mod){
        term.promptline += "(" + term.toBold(term.toMagenta(mod.name)) + ")"
        n += 20;
    }
    if(imp){
        term.promptline += term.toRed(imp.username) + "@" + term.toRed(imp.hostname) + ": "+ vars.globalOptions.path;
        n += 40;
    }else if(!mod) {
        term.promptline += "|"+term.toBold(term.toBlue('Nuages'));
        n += 20;
    }
    term.promptline += "> "
    term.promptLength = term.promptline.length - n;
}

term.setBufferLocation = function(x,y){
    term.moveBuffer(x-term._core.buffer.x,y-term._core.buffer.y);
};

term.moveBuffer = function(x,y){
    if(y>0){
        term.write("\033["+y+"B");
    }else if (y < 0){
        term.write("\033["+Math.abs(y)+"A");
    }
    if(x>0){
        term.write("\033["+x+"C");
    }else if (x < 0){
        term.write("\033["+Math.abs(x)+"D");
    }
};
term.GetFutureX = (s,x,y) => {
    return (x + s.length) % term._core.cols;
};
term.GetFutureY = (s,x,y) => {
    return y + Math.floor((x+ s.length) / term._core.cols);
};
term.prompt = () => {
    term.setPromptline();
    term.commandCursor = 0;
    term.write("\r\n" + term.promptline + term.command);
};

term.reprompt = () => {
    term.write("\r" + " ".repeat(term._core.cols));
    term.setPromptline();
    term.commandCursor = 0;
    term.write("\r" + term.promptline + term.command);
};
term.writeFwd = (s) => {
    var futureX = (term._core.buffer.x + s.length) % term._core.cols;
    var futureY = Math.floor((term._core.buffer.x+ s.length) / term._core.cols);
    term.write(s);
    term.moveBuffer(term._core.buffer.x-futureX,-futureY);
};

term.commandHistory = [];
term.commandHistoryCursor = 0;
term.commandBeforeHistory = "";
term.command = "";
term.command2 = "";
term.commandCursor = 0;
term.on('write', async function(key, ev) {
    console.log(key);
    console.log(ev);
});
term.on('key', async function(key, ev) {
    const printable = !ev.altKey && !ev.altGraphKey && !ev.ctrlKey && !ev.metaKey && (key != "\t");
    // Enter key pressed
    if (ev.keyCode === 13) {
        if(term.passwordMode){
            term.passwordMode = false;
            term.setPromptline();
            login(vars.user.email, term.command+term.command2);
        }else{
            term.commandHistory.push(term.command+term.command2);
            executeCommand(term.command+term.command2);
            term.write(term.command2);
        }
        term.command = "";
        term.command2 = "";
        term.commandHistoryCursor = 0;
        term.prompt();
        
        
    } else if (ev.keyCode === 8) {
        // Backspace key pressed
        var x = term._core.buffer.x;
        var y = term._core.buffer.y;
        if (term.command.length > 0) {
            term.command = term.command.substring(0,term.command.length-1)
            if(term.passwordMode){
                return;
            }
            if(x == 0){
                term.moveBuffer(term._core.cols,-1);
                term.write(" \b");
                var x2 = term._core.cols;
                var y2 = y-1;
            }else{
                var x2 = x-1;
                var y2 = y;
                term.write("\b \b");
            }
            if(term.command2.length > 0){
                var x3 = term.GetFutureX(term.command2+" ",x2,y2);
                var y3 = term.GetFutureY(term.command2+" ",x2,y2);
                term.write(term.command2+" ");
                if(x3 == 0){
                    term.moveBuffer(x2-(term._core.cols-1),y2-y3+1);
                }else{
                    term.moveBuffer(x2-x3,y2-y3)
                }
                
            }						
        }	
    }
    // Del Key pressed
    else if (ev.keyCode === 46) {
        if(term.command2.length > 0){
            var x = term._core.buffer.x;
            var y = term._core.buffer.y;
            var x3 = term.GetFutureX(term.command2+" ",x,y);
            var y3 = term.GetFutureY(term.command2+" ",x,y);
            term.command2 = term.command2.substring(1);
            term.write(term.command2+" ");
            if(x3 <= 1){
                term.moveBuffer(x-(term._core.cols-1),y-y3+1);
            }else{
                term.moveBuffer(x-x3+1,y-y3);
            }
        }
    }
    // Up key pressed
    else if (ev.keyCode === 38){
        if(term.commandHistory.length > term.commandHistoryCursor){
            term.commandHistoryCursor++;
            if (term.commandHistoryCursor == 1){
                term.commandBeforeHistory = term.command + term.command2;
            }
            term.command = term.commandHistory[term.commandHistory.length-term.commandHistoryCursor];
            term.reprompt();
        }
    }
    // Down key pressed
    else if (ev.keyCode === 40){
        if(term.commandHistoryCursor > 0){
            term.commandHistoryCursor--;
            if (term.commandHistoryCursor == 0){
                term.command = term.commandBeforeHistory;
                term.commandBeforeHistory = "";
                term.reprompt();
            }else{
                term.command = term.commandHistory[term.commandHistory.length-term.commandHistoryCursor];
                term.reprompt();
            }
        }
    }// Left key pressed
    else if (ev.keyCode === 37){
        if(term.command.length > 0){
            //term.commandCursor++;
            if(term._core.buffer.x == 0){
                term.moveBuffer(term._core.cols,-1);
            }else{
                term.write("\b");
            }
            term.command2 = term.command[term.command.length-1] + term.command2;
            if(term.command.length == 1){
                term.command = "";
            }else{
                term.command = term.command.substring(0,term.command.length-1);
            }
        }
    } // Right key pressed
    else if (ev.keyCode === 39){
        if(term.command2.length > 0){
            //term.commandCursor--;
            if(term._core.buffer.x == term._core.cols-1){
                term.write("\033[1B");
                term.write("\033["+term._core.cols+"D");
            }else{term.write(key);}
            term.command += term.command2.substring(0,1);
            if(term.command2.length == 1){
                term.command2 = "";
            }else{
                term.command2 = term.command2.substring(1);
            }
        }
    }
    else if (printable) {
        term.command += key;
        if(term.passwordMode){return;}
        var x = term._core.buffer.x;
        var y = term._core.buffer.y;
        term.write(key);
        if(term.command2.length > 0){
            if(x + 1 == term._core.cols){
                var x2 = 0;
                var y2 = y+1;
            }else{
                var x2 = x+1;
                var y2 = y;	
            }
            var x3 = term.GetFutureX(term.command2,x2,y2);
            var y3 = term.GetFutureY(term.command2,x2,y2);
            term.write(term.command2);
            if(x3 == 0){
                term.moveBuffer(x2-(term._core.cols-1),y2-y3+1);
            }else{
                term.moveBuffer(x2-x3,y2-y3)
            }
        }
    }
});

term.on('paste', function(data) {
    term.command += data;
    if(term.passwordMode){return;}
    var x = term._core.buffer.x;
    var y = term._core.buffer.y;
    term.write(data);
    if(term.command2.length > 0){
        var x2 = term.GetFutureX(data,x,y);
        var y2 = term.GetFutureY(data,x,y);
        var x3 = term.GetFutureX(term.command2,x2,y2);
        var y3 = term.GetFutureY(term.command2,x2,y2);
        term.write(term.command2);
        if(x3 == 0){
            term.moveBuffer(x2-(term._core.cols-1),y2-y3+1);
        }else{
            term.moveBuffer(x2-x3,y2-y3)
        }
        }
    });
}