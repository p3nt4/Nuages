const moduleHelper = require("../../../src/moduleHelper");

// This function returns the module object to be loaded in the database 
exports.load = function (app) {
    var module = {
        name: "windows/admin/reflected_assembly",
        options: {
            implant:{
                value: "",
                required: true,
                description: "The ID of the implant"
            },
            file: {
                value: "",
                required: true,
                description: "The ID of a the assembly file to load"
            },
            class:{
                value: "",
                required: true,
                description: "The class to load"
            },
            method:{
                value: "",
                required: true,
                description: "The method to run"
            },
            arguments:{
                value: "",
                required: false,
                description: "Arguments in format: MyString,[bool]true,[int]21"
            }
        },
        supportedOS: ["windows"],

        description: "Runs a method from a reflected assembly in the memory of the target implant",

        requiredPayloads: ["reflected_assembly"]
    }
    return module;
};

// This is the first function to be called when the module is run
exports.run = async function (app, run) {
    if (app,run.options.file.value != "" && run.options.file.value != " "){
        var file = await app.service("/fs/files").get(run.options.file.value).catch(() => {});
        if (!file){
            moduleHelper.logError(app,run, "File not found");
            moduleHelper.fail(app,run);
            return;
        }
        var job = await moduleHelper.createJob(app,run,"afterExecute",{type:"reflected_assembly", options:{file_id: file._id, length: file.length, chunkSize: file.chunkSize, class: run.options.class.value, method: run.options.method.value, arguments: run.options.arguments.value}}).catch(() => {});
    }else{
    var job = await moduleHelper.createJob(app,run,"afterExecute",{type:"reflected_assembly", options:{command: run.options.command.value}}).catch(() => {});
    }
    // Creating the job and setting the callback
    if(!job){
        moduleHelper.logError(app,run, "Error Creating reflected_assembly Job");
        moduleHelper.fail(app,run);
        return;
    }
    moduleHelper.logInfo(app,run, "Job submitted");
    moduleHelper.inProgress(app,run);

};

// There are callback than can be executed once jobs are completed
exports.afterExecute = async function (app, run, job) {
    // If job failed
    if(job.jobStatus == 4 ){
        moduleHelper.logError(app,run, "Error during method: \r\n" + job.result);
        moduleHelper.fail(app,run);
    }else{
        moduleHelper.logSuccess(app,run, "Successfully executed method: \r\n" + job.result);
        moduleHelper.success(app,run);
    }

};
