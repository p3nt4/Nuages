const handlerHelper = require("../../../src/handlerHelper");

const child_process = require('child_process');

const path = require("path");

// This function returns the handler object to be loaded in the database 
exports.load = function (app) {
    var handler = {
        name: "external/dns/aes256_py",
        options: {
            port: {
                value: "53",
                required: true,
                description: "The port to listen on"
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
            },
            domain:{
                value: "",
                required: true,
                description: "The controlled domain to use"
            },
            udp:{
                value: "true",
                required: true,
                description: "Listen for UDP requests"
            },
            tcp:{
                value: "false",
                required: true,
                description: "Listen for TCP requests"
            }
        },

        description: "DNS handler using AES256 encryption",

        // This module is not a nodejs module that can be run directly within Nuages - It must be called as an external process
        external: true

    }
    return handler;
};

// This is the first function to be called when the handler is run
exports.run = async function (app, run) {
    try{
        var script = path.join(__dirname,"DNSAES256Handler.py");

        var command = script +" -p " + run.options.port.value + " -k " + run.options.key.value + " -i " + run._id + " -d " + run.options.domain.value;

        if(run.options.udp.value.toLowerCase() == "true"){
            command += " --udp"
        }

        if(run.options.tcp.value.toLowerCase() == "true"){
            command += " --tcp"
        }
        command+=" -q";

        var python = app.get("python_path");

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
    }catch(e){
        handlerHelper.logError(app, run, e);
        handlerHelper.fail(app, run);
    }
}

// This is the function to be called when the handler is stopped
exports.stop = async function (app, run) {
    handlerHelper.stop_child_process(app, run);
    handlerHelper.logInfo(app, run, "Stopped process with PID: " + run.pid);
    handlerHelper.stopped(app, run);
};

