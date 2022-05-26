const scaleAssetSuffixMap = {
  '0.75': 'ldpi',
  '1': 'mdpi',
  '1.5': 'hdpi',
  '2': 'xhdpi',
  '3': 'xxhdpi',
  '4': 'xxxhdpi',
};

const drawableExtensions = new Set([
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.webp',
  '.xml',
]);

function getAndroidResourceFolderName(asset, scale) {
  if (!drawableExtensions.has(asset.extension)) {
    return 'raw';
  }
  const suffix = scaleAssetSuffixMap[scale];
  if (!suffix) {
    throw new Error(
      `Don't know which android drawable suffix to use for asset: ${JSON.stringify(
        asset
      )}`
    );
  }
  return `drawable-${suffix}`;
}

function getAndroidResourceIdentifier(asset) {
  const folderPath = getBasePath(asset);
  return `${folderPath}/${asset.basename}`
    .toLowerCase()
    .replace(/\//g, '_')
    .replace(/([^a-z0-9_])/g, '')
    .replace(/^assets_/, '');
}

function getBasePath(asset) {
  const basePath = asset.httpServerLocation;
  if (basePath[0] === '/') {
    return basePath.substr(1);
  }
  return basePath;
}

function getAssetDestinationPath(asset, scale, platform) {
  switch (platform) {
    case 'ios': {
      const iosFolder = asset.httpServerLocation
        .substr(1)
        .replace(/\.\.\//g, '_');
      return path.join(
        iosFolder,
        `${asset.basename}${scale === '1' ? '' : `@${scale}x`}${
          asset.extension
        }`
      );
    }
    case 'android': {
      const androidFolder = getAndroidResourceFolderName(asset, scale);
      const fileName = getAndroidResourceIdentifier(asset);
      return path.join(androidFolder, `${fileName}${asset.extension}`);
    }
  }
  throw new Error(`Unsupported platform "${platform}"`);
}

module.exports = {
  getAssetDestinationPath,
};
