const { Command } = require('commander');


exports.tunnels = new Command()
  .name("!tunnels")
  .arguments('[id]')
  .exitOverride()
  .description('Manage Tunnels')
  .option('--tcp', 'Create a tcp tunnel on the current implant')
  .option('--socks', 'Create a socks tunnel on the current implant')
  .option('--reverse', 'Create a reverse tunnel (--tcp only)')
  .option('-l, --listen <address>', 'Listening address [ip:]<port>')
  .option('-d, --destination <address>', 'Destination address <host>:<port>')
  .option('-t, --timeout <number>', 'Connection timeout in ms', (a,b)=>{return parseInt(a)})
  .option('-c, --channels <number>', 'Max number of channels', (a,b)=>{return parseInt(a)})
  .option('-r, --remove', 'Remove tunnel')
  .action(function (id, cmdObj) {
    if(!id){
        if(cmdObj.socks){
            if(!cmdObj.listen){ nuages.term.logError("Option -l/--listen is required"); return;}
            bindAddr = cmdObj.listen.split(":");
            var bindPort = bindAddr.length > 1 ? bindAddr[1] : bindAddr[0];
            var bindIP = bindAddr.length > 1 ? bindAddr[0] : "127.0.0.1";
            if(nuages.vars.globalOptions.implant.value == "" || nuages.vars.globalOptions.implant.value == undefined) {return;}
            nuages.tunnelService.create({
                port:bindPort, 
                type:"socks",
                destination: "socks",
                maxPipes: cmdObj.channels,
                timeout: cmdObj.timeout, 
                bindIP: bindIP,
                implantId: nuages.vars.implants[nuages.vars.globalOptions.implant.value]._id,
                jobOptions:{}
            }).then(() => {}).catch((err) => {
                nuages.term.logError(err.message);
            });
        }else if(cmdObj.tcp){
            if(!cmdObj.listen){ nuages.term.logError("Option -l/--listen is required"); return;}
            if(!cmdObj.destination){ nuages.term.logError("Option -d/--destination is required"); return;}
            bindAddr = cmdObj.listen.split(":");
            var bindPort = bindAddr.length > 1 ? bindAddr[1] : bindAddr[0];
            var bindIP = bindAddr.length > 1 ? bindAddr[0] : "127.0.0.1";
            destAddr = cmdObj.destination.split(":");
            if(destAddr.length < 2){
                nuages.term.logError("Destination should be in the format host:port")
                return;
            }
            if(cmdObj.reverse){
                if(nuages.vars.globalOptions.implant.value == "" || nuages.vars.globalOptions.implant.value == undefined) {return;}
                nuages.tunnelService.create({
                    port:bindPort, 
                    type:"rev_tcp",
                    destination: cmdObj.destination,
                    maxPipes: cmdObj.channels, 
                    bindIP: bindIP,
                    implantId: nuages.vars.implants[nuages.vars.globalOptions.implant.value]._id,
                    jobOptions:{}
                }).then(() => {}).catch((err) => {
                    nuages.term.logError(err.message);
                });
                
            }else{
                if(nuages.vars.globalOptions.implant.value == "" || nuages.vars.globalOptions.implant.value == undefined) {return;}
                nuages.tunnelService.create({
                    port:bindPort, 
                    type:"tcp_fwd",
                    destination: cmdObj.destination,
                    maxPipes: cmdObj.channels, 
                    bindIP: bindIP,
                    implantId: nuages.vars.implants[nuages.vars.globalOptions.implant.value]._id,
                    jobOptions:{}
                }).then(() => {}).catch((err) => {
                    nuages.term.logError(err.message);
                });
         }
        }
        else nuages.getTunnels();
    }else if(nuages.vars.tunnels[id] == undefined){
        nuages.term.logError("File not found");
    }else if(cmdObj.remove) {
        nuages.tunnelService.remove(nuages.vars.tunnels[id]._id).catch((err) => {
            nuages.term.logError(err.message);
        });
    }
    else{
        nuages.term.writeln("\r\n" + nuages.printTunnels({imp:nuages.vars.tunnels[id]}));
    }
    });