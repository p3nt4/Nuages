const { Command } = require('commander');


exports.webhooks =  new Command()
.name("!webhooks")
.arguments("[id]")
.exitOverride()
.description('Manage webhooks')
.option('-m, --mattermost <url>', 'Create Mattermost hook')
.option('-c, --custom <message>', 'Add a custom message')
.option('-r, --remove', 'Delete web hook')
.option('-i, --ignoreCertErrors', 'Ignore TLS errors')
.action(function (id, cmdObj) {
if(cmdObj.mattermost){
    var ignoreCertErrors = cmdObj.ignoreCertErrors ? true : false;
    nuages.webhookService.create({type: "mattermost", url: cmdObj.mattermost, ignoreCertErrors: ignoreCertErrors, customMessage: cmdObj.custom}).then(()=>{
        nuages.getWebhooks();
    }).catch((err) => {
        nuages.term.logError(err.message);
    });
}
else if (id != undefined){
    if(nuages.vars.webhooks[id] == undefined){
        nuages.term.logError("Web hook not found");
    }
    else if(cmdObj.remove !== undefined){
        nuages.webhookService.remove(nuages.vars.webhooks[id]._id).then(()=>{
            nuages.getWebhooks();
        }).catch((err) => {
            nuages.term.logError(err.message);
        });
    }
}
else{
    nuages.getWebhooks();
}
})