const fs = require('fs');
const path = require('path');
const { getMimeType } = require('./mime');

async function resolvePlatformSpecificFile(requestPath, platform) {
  const suffixes = [`.${platform}`, '.native', ''];
  const extension = path.extname(requestPath);
  const dirname = path.dirname(requestPath);
  const basename = path.basename(requestPath, extension);
  const files = await fs.promises.readdir(dirname);
  for (const suffix of suffixes) {
    const filename = `${basename}${suffix}${extension}`;
    if (files.includes(filename)) {
      return path.join(dirname, filename);
    }
  }
  return null;
}

async function sendFile(res, filePath) {
  const file = await fs.promises.open(filePath, 'r');
  try {
    const stat = await file.stat();
    if (!stat.isFile()) {
      throw new Error('Path is directory');
    }
    const contentType = getMimeType(filePath);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
    });

    res.end(await file.readFile());
  } finally {
    file.close();
  }
}

async function serveAsset(res, requestPath, platform) {
  const filePath = await resolvePlatformSpecificFile(requestPath, platform);
  if (filePath) {
    await sendFile(res, filePath);
    return true;
  }
  return false;
}

module.exports = { serveAsset };
