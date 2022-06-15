const { Server } = require('ws');

function createHMREndpoint(logger) {
  const server = new Server({ noServer: true });

  let clientSocket;

  function sendSafely(type, body) {
    if (clientSocket) {
      clientSocket.send(JSON.stringify({ type, body }));
    }
  }

  function reload() {
    // Esbuild doesn't support HMR, but we can hack the update API
    // to implement an opt-in live reload functionality
    sendSafely('update', {
      added: [
        {
          module: [
            'esbuild_reload_hack',
            '(window.__turboModuleProxy ? window.__turboModuleProxy("DevSettings") : window.nativeModuleProxy["DevSettings"]).reload();',
          ],
          sourceURL: null,
        },
      ],
      deleted: [],
      modified: [],
    });
  }

  const socketCloseHandler = () => {
    clientSocket = null;
  };

  server.on('connection', (socket, request) => {
    clientSocket = socket;
    clientSocket.onerror = socketCloseHandler;
    clientSocket.onclose = socketCloseHandler;
    clientSocket.onmessage = ({ data }) => {
      const event = JSON.parse(data);
      switch (event.type) {
        case 'log':
          const log = logger[event.level] || logger.log;
          log(event.level, event.data);
          break;
      }
    };
  });

  return {
    server,
    reload,
  };
}

module.exports = { createHMREndpoint };
