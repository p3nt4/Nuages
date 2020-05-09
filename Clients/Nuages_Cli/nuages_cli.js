#!/usr/bin/env node
const cmdexec = require("./app/cmd");
const getTerm = require("./app/term").getTerm;
nuages = require("./app/nuagesAPI").nuages;
var rl = require('readline'); 
var fs = require("fs");

nuages.getTerm = function(){
	term = getTerm();
	term.on('line',function(line) {
		if(!nuages.term.channelMode){
			try{
				cmdexec.execute(line);
			}catch(e){if(e.message!=="(outputHelp)"){nuages.term.logError(e.message);}}
			nuages.term.setPromptline();
			nuages.term.cprompt(); 
		}else{
			nuages.syncIO(line);
		}
	}); 
	return term;
}

nuages.term = nuages.getTerm();

if(nuages.program.script){
	const readInterface = rl.createInterface({
		input: fs.createReadStream(nuages.program.script),
		output: process.stdout,
		console: false
	});
	readInterface.on('line', function(line) {
		nuages.term.write(line + "\n");
	});
}

const run = async () => {
        nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("                     +,,,,,,,,,,~=                        ")));
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("                    ?,,,,,,,,,,,,,,,,?                      ")));
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("                  +,,,,,,,,,,,,,,,,,,,:                                        ")));
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("                 ~,,,,,,,,,,,,,,,,+,,,,,,,,,+               ")));
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("               ,+?+:,,,,,,,,,,,,?,,,,,,,,,,,,,=             ")));
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("            ?,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,:,,,,,,,,,?     ")));
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("        ?,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,= ")));
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("       :,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,   , ,,,,,,,,,, ")));
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("      ~+=:,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,:~,,,,,,,  ")));
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("   ? ,,,,,,,=,,,,,,,,,,,,,,,,,"))+"_  _  __  __    __    ___  ____  ___     ___  ___  ");
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold(" + ,,,,,,,,,,, ,,, :,,,,,,,,,"))+"( \\( )(  )(  )  /__\\  / __)( ___)/ __)   / __)(__ \\ ");
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("+ ,,,,,,,,,,,,,,,?,,,,,,,,,,, "))+")  (  )(__)(  /(__)\\( (_-. )__) \\__ \\  ( (__  / _/ ");
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold(" ,,,,,,,,,,,,,,?,,,,,,,,,,,,,"))+"(_)\\_)(______)(__)(__)\\___/(____)(___/   \\___)(____)");
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold(",,,,,,,,,,,,,,=,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,?          ")));
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("  ~,,,,,,,,,,?,,,,,,,,,,,,,,, ,,,,,,,,,,,,,,,,,,,,,,+       ")));
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("     ~+ ,,,,,~,,,,,,,,,,,,,,, ,,,,,,,,,,:,,,,,,,,,,+        ")));
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("        ,,,,,,+ ,,,,,,,,,,,,,: ,,,,,,,,= +:   =?~           ")));
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("          I:=, :,,,,,,,,,,,,,,+?,,,,,,~                     ")));
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("                 =:,,,,,,,, ?                               ")));
		nuages.term.writeln(nuages.term.toBlue(nuages.term.toBold("                     :++~                                   ")));
		nuages.term.writeln("                                             !help for assistance");
        nuages.term.setPromptline();
        nuages.term.cprompt();
};

run();