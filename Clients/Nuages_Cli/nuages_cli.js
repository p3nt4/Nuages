#!/usr/bin/env node
const cmdexec = require("./app/cmd");
const getTerm = require("./app/term").getTerm;
nuages = require("./app/nuagesAPI").nuages;

nuages.getTerm = function(){
	term = getTerm();
	term.on('line',function(line) {
		if(!nuages.term.channelMode){
			try{
				cmdexec.execute(line);
			}catch(e){nuages.term.logError(e.message);}
			nuages.term.setPromptline();
			nuages.term.prompt(); 
		}else{
			nuages.syncIO(line);
		}
	}); 
	return term;
}

nuages.term = nuages.getTerm();

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
        nuages.term.prompt();
};

run();