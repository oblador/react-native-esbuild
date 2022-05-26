const http = require('http');
const path = require('path');
const { parse: parseUrl } = require('url');
const {
  createDevServerMiddleware,
  indexPageMiddleware,
} = require('@react-native-community/cli-server-api');
const {
  createBundler,
  serveAsset,
  extractBundleParams,
  symbolicateStack,
} = require('../server');
const { emptyDefaultCacheDir } = require('../cache');

const ASSETS_PUBLIC_PATH = '/assets/';

module.exports = (getBundleConfig) => async (_, config, args) => {
  const {
    host = '127.0.0.1',
    port = 8081,
    projectRoot = config.root,
    resetCache,
  } = args;

  if (resetCache) {
    emptyDefaultCacheDir();
  }

  const { middleware, websocketEndpoints, messageSocketEndpoint } =
    createDevServerMiddleware({
      host,
      port,
      watchFolders: [],
    });

  let connectedDevices = 0;
  const reload = () => {
    if (connectedDevices > 0) {
      messageSocketEndpoint.broadcast('reload');
    }
  };
  const bundler = createBundler(
    (options) =>
      getBundleConfig(config, {
        ...options,
        assetsPublicPath: ASSETS_PUBLIC_PATH,
      }),
    reload
  );

  middleware.use(async (req, res, next) => {
    try {
      const { pathname, query } = parseUrl(req.url, true);
      if (pathname.startsWith(ASSETS_PUBLIC_PATH)) {
        const requestPath = path.join(
          config.root,
          pathname.substring(ASSETS_PUBLIC_PATH.length)
        );
        const { platform } = query;

        if (!(await serveAsset(res, requestPath, platform))) {
          next();
        }
      } else if (pathname.endsWith('.bundle')) {
        const { platform, dev, minify, entryFile } = extractBundleParams(
          req.url
        );
        try {
          const bundle = await bundler.getBundle(
            platform,
            path.join(projectRoot, entryFile),
            dev,
            minify
          );
          return res
            .writeHead(200, { 'Content-Type': 'application/javascript' })
            .end(bundle);
        } catch (error) {
          return res.writeHead(400).end(error.message);
        }
      } else if (pathname === '/symbolicate') {
        const { stack } = JSON.parse(req.rawBody);
        const url = stack.find(({ file }) => file.startsWith('http')).file;
        const { platform, entryFile } = extractBundleParams(url);
        const sourceMapConsumer = await bundler.getSourcemap(
          platform,
          path.join(projectRoot, entryFile)
        );

        const symbolicated = symbolicateStack(sourceMapConsumer, stack);
        const stringified = JSON.stringify(symbolicated);
        return res
          .writeHead(200, { 'Content-Type': 'application/json' })
          .end(stringified);
      }
    } catch (error) {
      return next(error);
    }
    next();
  });

  middleware.use(indexPageMiddleware);

  const server = http.createServer(middleware);

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parseUrl(request.url);
    const handler = websocketEndpoints[pathname];

    if (handler) {
      handler.handleUpgrade(request, socket, head, (ws) => {
        handler.emit('connection', ws, request);
      });
    } else if (pathname === '/inspector/device') {
      connectedDevices++;
      socket.onclose = () => {
        connectedDevices--;
      };
    } else {
      socket.destroy();
    }
  });

  server.listen(port);
};
