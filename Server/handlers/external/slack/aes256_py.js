const handlerHelper = require("../../../src/handlerHelper");

const child_process = require('child_process');

const path = require("path");

// This function returns the handler object to be loaded in the database 
exports.load = function (app) {
    var handler = {
        name: "external/slack/aes256_py",
        options: {
            python: {
                value: "0",
                required: true,
                description: "[0] python [1] python3"
            },
            token: {
                required: true,
                description: "The slack token"
            },
            bot:{
                required: true,
                description: "The ID of the slack bot"
            },
            key: {
                value: "",
                required: true,
                description: "The encryption key"
            },
            uri:{
                value: "http://127.0.0.1:3030",
                required: true,
                description: "The URI of the Nuages API"
            }
        },

        description: "SLACK handler using AES256 encryption",

        // This module is not a nodejs module that can be run directly within Nuages - It must be called as an external process
        external: true

    }
    return handler;
};

function escapeShellArg (arg) {
    return arg.replace(/(\s+)/g, '');
}

// This is the first function to be called when the handler is run
exports.run = async function (app, run) {

    var script = path.join(__dirname,"SLACKAES256Handler.py");

    var command = script +" -t " + escapeShellArg(run.options.token.value) + " -k " + escapeShellArg(run.options.key.value) + " -b " + escapeShellArg(run.options.bot.value) + " -q" + " -i " + run._id;

    if(app, run.options.uri.value && run.options.uri.value != ""){
        command+= " -u " + escapeShellArg(run.options.uri.value);
    }
    
    var python = run.options.python.value == "0" ? "python" : "python3";

    var child = child_process.execFile(python,command.split(" "),{}, function (error, stdout, stderr) {
        if(error.killed == false){
            handlerHelper.logError(app, run, "The external handler exited with error:\n" + error + "\n" + stdout + "\n" + stderr);
            handlerHelper.fail(app, run);
        }
    });

    handlerHelper.save_child_process(app, child);
    run.pid = child.pid;
    handlerHelper.logInfo(app, run, "External process started with PID: " + child.pid);
    handlerHelper.running(app, run);
}

// This is the function to be called when the handler is stopped
exports.stop = async function (app, run) {
    handlerHelper.stop_child_process(app, run);
    handlerHelper.logInfo(app, run, "Stopped process with PID: " + run.pid);
    handlerHelper.stopped(app, run);
};

