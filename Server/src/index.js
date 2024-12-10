/* eslint-disable no-console */
const logger = require('./logger');
const app = require('./app');
const port = app.get('port');
const host = app.get('host');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}  

process.on('unhandledRejection', (reason, p) =>
  logger.error('Unhandled Rejection at: Promise ', p, reason)
);

app.listen(port).then(() =>{
  logger.info('Nuages C2 started on http://%s:%d', host, port);

  // Initialize pipe list
  app.pipe_list = {};

  // Initialize proces list
  app.child_process_list = {};
  
  // Sleep one second for the app to get ready
  sleep(1000).then(()=>{
    try{
      app.service("/listeners").find({query:{runStatus: 3}}).then((data)=>{
          for(var i = 0; i < data.data.length; i++){
            console.log("Restarting listener: " + data.data[i]._id); 
            app.service("/listeners/startstop").create({id:data.data[i]._id, wantedStatus: 3, force: true}).catch((err)=>{
              console.error(err);
            });
          }
      });
    } 
    catch(e){
        console.error(e);
    }

    try{
      app.service("/modules").find().then((data)=>{
          if(data.total == 0){
            app.service("/modules/load").create({modulePath:"all"});
          }
      });
    } 
    catch(e){
        console.error(e);
    }
    try{
      app.service("/handlers").find().then((data)=>{
          if(data.total == 0){
            app.service("/handlers/load").create({handlerPath:"all"});
          }
      });
    } 
    catch(e){
        console.error(e);
    }
  });
});

function exitHandler(options, exitCode) {
  if(app.child_process_list != undefined){
      for (let [pid, child] of Object.entries(app.child_process_list)) {
          try{
              if(child.killed!=true){
                  if(child.kill("SIGKILL")){
                      console.log("Successfully killed child process with PID: "+ pid.toString());
                  }else{
                      console.log("Failed to kill child process with PID: "+ pid.toString());
                  }; 
              } 
          }catch(e){
              console.error(e);
          }
        }
  }
  process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {}));
process.on('SIGUSR2', exitHandler.bind(null, {}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {}));

