const ASSETS_PUBLIC_PATH = '/assets/';
const BITMAP_IMAGE_EXTENSIONS = [
  '.bmp',
  '.gif',
  '.jpg',
  '.jpeg',
  '.png',
  '.psd',
  '.svg',
  '.webp',
];
const NON_BITMAP_IMAGE_EXTENSIONS = [
  // Vector image formats
  '.svg',
  // Video formats
  '.m4v',
  '.mov',
  '.mp4',
  '.mpeg',
  '.mpg',
  '.webm',
  // Audio formats
  '.aac',
  '.aiff',
  '.caf',
  '.m4a',
  '.mp3',
  '.wav',
  // Document formats
  '.html',
  '.pdf',
  '.yaml',
  '.yml',
  // Font formats
  '.otf',
  '.ttf',
  // Archives (virtual files)
  '.zip',
];
const ASSET_EXTENSIONS = BITMAP_IMAGE_EXTENSIONS.concat(
  NON_BITMAP_IMAGE_EXTENSIONS
);
const SOURCE_EXTENSIONS = [
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
];
module.exports = {
  ASSETS_PUBLIC_PATH,
  BITMAP_IMAGE_EXTENSIONS,
  ASSET_EXTENSIONS,
  SOURCE_EXTENSIONS,
};
