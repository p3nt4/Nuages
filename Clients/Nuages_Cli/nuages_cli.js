#!/usr/bin/env node
const cmdexec = require("./app/cmd");
const getTerm = require("./app/term").getTerm;
nuages = require("./app/nuagesAPI").nuages;
var fs = require('fs'); 

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

async function runScriptFile(file){
	script = fs.readFileSync(nuages.program.script,'utf8');
	console.log(script);
	var arr = script.split('\n');
	for(var i = 0; i < arr.length; i++){
		arr[i] = arr[i].replace('\r','');
		if(arr[i].split(" ").length > 1 && arr[i].split(" ")[0] == "!sleep"){
			await nuages.sleep(arr[i].split(" ")[1]);
		}
		else{
			nuages.term.write(arr[i] + "\n");
			await nuages.sleep(500);
		}
	}

}
if(nuages.program.script){
	runScriptFile(nuages.program.script)
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