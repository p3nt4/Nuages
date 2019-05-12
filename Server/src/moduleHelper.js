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
    app.service("/modules/run").patch(run._id, run);
};

// This function creates a job for the module
exports.createJob = async function (app, run, callback, payload) {
    return app.service("jobs").create({
        moduleRun:{runId: run._id, callback: callback, moduleName: run.moduleName},
        implantId: run.options.implant.value,
        timeout: Date.now() + 5 * 6000,
        payload: payload}
    );
};

// This function fails the run
exports.fail = function (run) {
    run.runStatus = 4;
};

// This function marks the run as succeeded
exports.success = function (run) {
    run.runStatus = 3;
};

// This function marks the run as in progrss
exports.inProgress = function (run) {
    run.runStatus = 2;
};
