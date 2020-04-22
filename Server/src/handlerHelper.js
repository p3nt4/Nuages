// This function ads an [Info] event to the log
exports.logInfo = function (app, run, message) {
    logEntry = {
        type: 0,
        message: message,
        sourceId: run._id,
        sourceType: "handler",
        sourceName: run.handlerName
    };
    app.service("/logs").create(logEntry);
};

// This function ads a [Success] event to the log
exports.logSuccess = function (app, run, message) {
    logEntry = {
        type: 2,
        message: message,
        sourceId: run._id,
        sourceType: "handler",
        sourceName: run.handlerName
    };
    app.service("/logs").create(logEntry);
};

// This function ads an [Error] event to the log
exports.logError = function (app, run, message) {
    logEntry = {
        type: 1,
        message: message,
        sourceId: run._id,
        sourceType: "handler",
        sourceName: run.handlerName
    };
    app.service("/logs").create(logEntry);
};


// This function fails the handler run
exports.fail = function (app, run) {
    run.runStatus = 4;
    app.service("listeners").patch(run._id, run);
};

// This function marks the run running
exports.running = function (app, run) {
    run.runStatus = 3;
    app.service("listeners").patch(run._id, run);
};

// This function marks the run as stopped
exports.stopped = function (app, run){
    run.runStatus = 2;
    app.service("listeners").patch(run._id, run);
};

// This adds the proces to the app child process list
exports.save_child_process = function (app,process) {
    if(app.child_process_list == undefined){
        app.child_process_list = {};
    }
    app.child_process_list[process.pid] = process;
};

// This stops a child process
exports.stop_child_process = function (app,run) {
    if(app.child_process_list != undefined && app.child_process_list[run.pid] != undefined){
        var child = app.child_process_list[run.pid];
        if(child.killed!=true){
            if(child.kill("SIGKILL")){
                console.log("Successfully killed child process with PID: "+ run.pid.toString());
            }else{
                console.log("Failed to kill child process with PID: "+ run.pid.toString());
            }; 
        } 
    }
};