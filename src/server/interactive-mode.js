const readline = require('readline');
const { logger } = require('@react-native-community/cli-tools');

function printInteractiveModeInstructions() {
  logger.log('To reload the app press "r"\nTo open developer menu press "d"');
}

function enableInteractiveMode(messageSocket) {
  // We need to set this to true to catch key presses individually.
  // As a result we have to implement our own method for exiting
  // and other commands (e.g. ctrl+c & ctrl+z)
  if (!process.stdin.setRawMode) {
    logger.debug('Interactive mode is not supported in this environment');

    return;
  }

  readline.emitKeypressEvents(process.stdin);

  process.stdin.setRawMode(true);

  printInteractiveModeInstructions();

  process.stdin.on('keypress', (_key, data) => {
    const { ctrl, name } = data;

    if (ctrl === true) {
      switch (name) {
        case 'c':
          process.exit();
          break;

        case 'z':
          process.emit('SIGTSTP', 'SIGTSTP');
          break;
      }
    } else if (name === 'r') {
      messageSocket.broadcast('reload', null);

      logger.info('Reloading app...');
    } else if (name === 'd') {
      messageSocket.broadcast('devMenu', null);

      logger.info('Opening developer menu...');
    } else {
      logger.log(_key);
    }
  });
}

module.exports = { enableInteractiveMode };
