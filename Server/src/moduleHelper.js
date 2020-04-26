// This function ads an [Info] event to the log
exports.logInfo = function (app, run, message) {
    logEntry = {
        type: 0,
        message: message,
        sourceId: run._id,
        sourceType: "module",
        sourceName: run.moduleName
    };
    app.service("/logs").create(logEntry);
};

// This function ads a [Success] event to the log
exports.logSuccess = function (app, run, message) {
    logEntry = {
        type: 2,
        message: message,
        sourceId: run._id,
        sourceType: "module",
        sourceName: run.moduleName
    };
    app.service("/logs").create(logEntry);
};

// This function ads an [Error] event to the log
exports.logError = function (app, run, message) {
    logEntry = {
        type: 1,
        message: message,
        sourceId: run._id,
        sourceType: "module",
        sourceName: run.moduleName
    };
    app.service("/logs").create(logEntry);
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

// This function creates a job for the module with an included pipe
exports.createJobWithPipe = async function (app, run, callback, payload, pipe) {
    return app.service("jobs").create({
        moduleRun:{runId: run._id, callback: callback, moduleName: run.moduleName},
        implantId: run.options.implant.value,
        pipe: pipe,
        timeout: Date.now() + 5 * 6000,
        payload: payload}
    );
};

// This function fails the run
exports.fail = function (app, run) {
    run.runStatus = 4;
    app.service("/modules/run").patch(run._id, run);
};

// This function marks the run as succeeded
exports.success = function (app, run) {
    run.runStatus = 3;
    app.service("/modules/run").patch(run._id, run);
};

// This function marks the run as in progrss
exports.inProgress = function (app, run) {
    run.runStatus = 2;
    app.service("/modules/run").patch(run._id, run);
};
