// This function ads an [Info] event to the log
exports.logInfo = function (run, message) {
    logEntry = {
        type: 0,
        message: message,
        time: Date.now()
    };
    run.log.push(logEntry);
};

// This function ads a [Success] event to the log
exports.logSuccess = function (run, message) {
    logEntry = {
        type: 2,
        message: message,
        time: Date.now()
    };
    run.log.push(logEntry);
};

// This function ads an [Error] event to the log
exports.logError = function (run, message) {
    logEntry = {
        type: 1,
        message: message,
        time: Date.now()
    };
    run.log.push(logEntry);
};

// This function updates the current Run, it should be called after the run is changed otherwise changes wont be saved.
exports.patch = function (app, run) {
    app.service("listeners").patch(run._id, run);
};


// This function fails the handler run
exports.fail = function (run) {
    run.runStatus = 4;
};

// This function marks the run running
exports.running = function (run) {
    run.runStatus = 3;
};

// This function marks the run as stopped
exports.stopped = function (run) {
    run.runStatus = 2;
};

// This function marks the run as submitted
exports.pause = function (run) {
    run.runStatus = 2;
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