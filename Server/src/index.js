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

async function restartListeners() {
  try {
    const response = await app.service('/listeners').find({ query: { runStatus: 3 } });

    for (const listener of response.data || []) {
      console.log(`Restarting listener: ${listener._id}`);
      await app.service('/listeners/startstop').create({
        id: listener._id,
        wantedStatus: 3,
        force: true,
      }).catch((error) => {
        console.error(error);
      });
    }
  } catch (error) {
    console.error(error);
  }
}

async function loadDefaultModulesIfNeeded() {
  try {
    const modules = await app.service('/modules').find();
    if (modules.total === 0) {
      await app.service('/modules/load').create({ modulePath: 'all' });
    }
  } catch (error) {
    console.error(error);
  }
}

async function loadDefaultHandlersIfNeeded() {
  try {
    const handlers = await app.service('/handlers').find();
    if (handlers.total === 0) {
      await app.service('/handlers/load').create({ handlerPath: 'all' });
    }
  } catch (error) {
    console.error(error);
  }
}

async function initializeRuntimeState() {
  logger.info('Nuages C2 started on http://%s:%d', host, port);

  // Initialize runtime collections used by child processes and pipe-backed sessions.
  app.pipe_list = {};
  app.child_process_list = {};

  await sleep(1000);

  await Promise.all([
    restartListeners(),
    loadDefaultModulesIfNeeded(),
    loadDefaultHandlersIfNeeded(),
  ]);
}

process.on('unhandledRejection', (reason, p) =>
  logger.error('Unhandled Rejection at: Promise ', p, reason)
);

app.listen(port)
  .then(() => initializeRuntimeState())
  .catch((error) => {
    logger.error('Failed to initialize Nuages C2.', error);
    process.exit(1);
  });

function exitHandler() {
  if (app.child_process_list !== undefined) {
    for (const [pid, child] of Object.entries(app.child_process_list)) {
      try {
        if (child.killed !== true && child.kill('SIGKILL')) {
          console.log(`Successfully killed child process with PID: ${pid}`);
        } else {
          console.log(`Failed to kill child process with PID: ${pid}`);
        }
      } catch (error) {
        console.error(error);
      }
    }
  }
  process.exit();
}

// Do something when the app is closing.
process.on('exit', exitHandler);

// Catch Ctrl+C events.
process.on('SIGINT', exitHandler);

// Catch "kill pid" events (for example: nodemon restart).
process.on('SIGUSR1', exitHandler);
process.on('SIGUSR2', exitHandler);

// Catch uncaught exceptions.
process.on('uncaughtException', exitHandler);

