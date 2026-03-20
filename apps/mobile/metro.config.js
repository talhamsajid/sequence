const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root and shared packages
config.watchFolders = [monorepoRoot];

// Resolve node_modules from both the app and the monorepo root (hoisted)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// SVG transformer — render .svg files as React components
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
};

// Treat SVGs as source files, not assets
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== "svg");
config.resolver.sourceExts = [...config.resolver.sourceExts, "svg"];

module.exports = config;
