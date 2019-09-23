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
    if (run.options.file.value != "" && run.options.file.value != " "){
        var file = await app.service("/fs/files").get(run.options.file.value).catch(() => {});
        if (!file){
            moduleHelper.logError(run, "File not found");
            moduleHelper.fail(run);
            moduleHelper.patch(app,run);
            return;
        }
        var job = await moduleHelper.createJob(app,run,"afterExecute",{type:"posh_in_mem", options:{file_id: file._id, length: file.length, chunkSize: file.chunkSize, command: run.options.command.value}}).catch(() => {});
    }else{
    var job = await moduleHelper.createJob(app,run,"afterExecute",{type:"posh_in_mem", options:{command: run.options.command.value}}).catch(() => {});
    }

    // Creating the job and setting the callback
    
    if(!job){
        moduleHelper.logError(run, "Error Creating posh_in_mem Job");
        moduleHelper.fail(run);
        moduleHelper.patch(app,run);
        return;
    }
    moduleHelper.logInfo(run, "Job submitted");
    moduleHelper.inProgress(run);
    moduleHelper.patch(app,run);
};

// There are callback than can be executed once jobs are completed
exports.afterExecute = async function (app, run, job) {
    // If job failed
    if(job.jobStatus == 4 ){
        moduleHelper.logError(run, "Error during script: \r\n" + job.result);
        moduleHelper.fail(run);
    }else{
        moduleHelper.logSuccess(run, "Successfully executed script: \r\n" + job.result);
        moduleHelper.success(run);
    }
    moduleHelper.patch(app,run);
};
