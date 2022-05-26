const os = require('os');
const path = require('path');
const fs = require('fs-extra');

let defaultCacheDir = null;
function getDefaultCacheDir() {
  if (!defaultCacheDir) {
    defaultCacheDir = path.join(os.tmpdir(), 'react-native-esbuild');
  }
  return defaultCacheDir;
}

function emptyDefaultCacheDir() {
  fs.emptyDirSync(getDefaultCacheDir());
}

module.exports = { getDefaultCacheDir, emptyDefaultCacheDir };
