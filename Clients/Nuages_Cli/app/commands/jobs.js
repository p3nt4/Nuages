const { Command } = require('commander');


exports.jobs = new Command()
  .name("!jobs")
  .arguments("[id]")
  .exitOverride()
  .description('Manage jobs')
  .option('-s, --save <path>', 'Save job output locally')
  .option('-c, --command <command>', 'Filter jobs by command')
  .option('-i, --implant <id>', 'Filter jobs by implant')
  .option('-t, --type <type>', 'Filter jobs by type')
  .option('-m, --max <max>', 'Maximum number of results', 10)
  .option('-k, --kill', 'Instruct implant to kill job')
  .action(function (id, cmdObj) {
    if(!id){
        query = {$limit: cmdObj.max, $sort: { lastUpdated: -1 }}
        if(cmdObj.implant && nuages.vars.implants[cmdObj.implant]) query["implantId"] = nuages.vars.implants[cmdObj.implant]._id;
        if(cmdObj.command) query["payload.options.cmd"] = cmdObj.command;
        if(cmdObj.type) query["payload.type"] = cmdObj.type;
        nuages.getJobs(query);
    }else if(nuages.vars.jobs[id] == undefined){
        nuages.term.logError("Job not found");
    }else if(cmdObj.save){
        nuages.saveJobToFile(nuages.vars.jobs[id], cmdObj.save);
    }else if(cmdObj.kill){
        nuages.createJob(nuages.vars.jobs[id].implantId.substring(0, 6), {type:"kill_job", options:{ job_id: nuages.vars.jobs[id]._id}});
    }
    else{
        nuages.term.writeln("\r\n" + nuages.printJobs({imp:nuages.vars.jobs[id]}));
        nuages.term.writeln("\r\n" + nuages.vars.jobs[id].result);
    }
    })
    