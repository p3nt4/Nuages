const moduleHelper = require("../../../src/moduleHelper");

// This function returns the module object to be loaded in the database 
exports.load = function (app) {
    var module = {
        name: "windows/admin/posh_in_mem",
        options: {
            file: {
                value: "",
                required: false,
                description: "The ID of a powershell script file to run"
            },
            command:{
                value: "",
                required: false,
                description: "A command to run or add to the powershell script"
            },
            implant:{
                value: "",
                required: true,
                description: "The ID of the implant"
            }
        },
        supportedOS: ["windows"],

        description: "Runs a powershell script in the memory of the target implant",

        requiredPayloads: ["posh_in_mem"]
    }
    return module;
};

// This is the first function to be called when the module is run
exports.run = async function (app, run) {
    if (app, run.options.file.value != "" && run.options.file.value != " "){
        var file = await app.service("/files").get(run.options.file.value).catch(() => {});
        if (!file){
            moduleHelper.logError(app, run, "File not found");
            moduleHelper.fail(app, run);
            return;
        }
        var job = await moduleHelper.createJobWithPipe(app,run,"afterExecute",
        {
            type:"posh_in_mem", 
            options:
            {
                length: file.length, 
                command: run.options.command.value
            }
        },
        {type: "download",
            source: file._id, 
            destination: "memory",
            length: file.length, 
            implantId: run.options.implant.value
        }).catch(() => {});
    }else{
    var job = await moduleHelper.createJob(app,run,"afterExecute",{type:"posh_in_mem", options:{command: run.options.command.value}}).catch(() => {});
    }

    // Creating the job and setting the callback
    
    if(!job){
        moduleHelper.logError(app, run, "Error Creating posh_in_mem Job");
        moduleHelper.fail(app, run);
        return;
    }
    moduleHelper.logInfo(app, run, "Job submitted");
    moduleHelper.inProgress(app, run);
};

// There are callback than can be executed once jobs are completed
exports.afterExecute = async function (app, run, job) {
    // If job failed
    if(job.jobStatus == 4 ){
        moduleHelper.logError(app, run, "Error during script: \r\n" + job.result);
        moduleHelper.fail(app, run);
    }else{
        moduleHelper.logSuccess(app, run, "Successfully executed script: \r\n" + job.result);
        moduleHelper.success(app, run);
    }

};
