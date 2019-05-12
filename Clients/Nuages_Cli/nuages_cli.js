#!/usr/bin/env node
const cmdexec = require("./app/cmd");
const term = require("./app/term").term;
nuages = require("./app/nuagesAPI").nuages;

const run = async () => {
        term.writeln(term.toBlue(term.toBold("                     +,,,,,,,,,,~=                        ")));
		term.writeln(term.toBlue(term.toBold("                    ?,,,,,,,,,,,,,,,,?                      ")));
		term.writeln(term.toBlue(term.toBold("                  +,,,,,,,,,,,,,,,,,,,:                                        ")));
		term.writeln(term.toBlue(term.toBold("                 ~,,,,,,,,,,,,,,,,+,,,,,,,,,+               ")));
		term.writeln(term.toBlue(term.toBold("               ,+?+:,,,,,,,,,,,,?,,,,,,,,,,,,,=             ")));
		term.writeln(term.toBlue(term.toBold("            ?,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,:,,,,,,,,,?     ")));
		term.writeln(term.toBlue(term.toBold("        ?,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,= ")));
		term.writeln(term.toBlue(term.toBold("       :,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,   , ,,,,,,,,,, ")));
		term.writeln(term.toBlue(term.toBold("      ~+=:,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,:~,,,,,,,  ")));
		term.writeln(term.toBlue(term.toBold("   ? ,,,,,,,=,,,,,,,,,,,,,,,,,"))+"_  _  __  __    __    ___  ____  ___     ___  ___  ");
		term.writeln(term.toBlue(term.toBold(" + ,,,,,,,,,,, ,,, :,,,,,,,,,"))+"( \\( )(  )(  )  /__\\  / __)( ___)/ __)   / __)(__ \\ ");
		term.writeln(term.toBlue(term.toBold("+ ,,,,,,,,,,,,,,,?,,,,,,,,,,, "))+")  (  )(__)(  /(__)\\( (_-. )__) \\__ \\  ( (__  / _/ ");
		term.writeln(term.toBlue(term.toBold(" ,,,,,,,,,,,,,,?,,,,,,,,,,,,,"))+"(_)\\_)(______)(__)(__)\\___/(____)(___/   \\___)(____)");
		term.writeln(term.toBlue(term.toBold(",,,,,,,,,,,,,,=,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,?          ")));
		term.writeln(term.toBlue(term.toBold("  ~,,,,,,,,,,?,,,,,,,,,,,,,,, ,,,,,,,,,,,,,,,,,,,,,,+       ")));
		term.writeln(term.toBlue(term.toBold("     ~+ ,,,,,~,,,,,,,,,,,,,,, ,,,,,,,,,,:,,,,,,,,,,+        ")));
		term.writeln(term.toBlue(term.toBold("        ,,,,,,+ ,,,,,,,,,,,,,: ,,,,,,,,= +:   =?~           ")));
		term.writeln(term.toBlue(term.toBold("          I:=, :,,,,,,,,,,,,,,+?,,,,,,~                     ")));
		term.writeln(term.toBlue(term.toBold("                 =:,,,,,,,, ?                               ")));
		term.writeln(term.toBlue(term.toBold("                     :++~                                   ")));
		term.writeln("                                             !help for assistance");
        term.setPromptline();
        term.prompt();
    term.on('line',function(line) {
        try{
            cmdexec.execute(line);
        }catch(e){term.logError(e.message);}
        term.setPromptline();
        term.prompt(); 
    }); 
};

run();