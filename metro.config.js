const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Watch folders for local file: dependencies
const localPackages = [
  path.resolve(__dirname, '..', 'dario-wdk-react-native-core'),
  path.resolve(__dirname, '..', 'pear-wrk-wdk'),
];

config.watchFolders = localPackages;

// Ensure all modules resolve from this project's node_modules
const nodeModulesPath = path.resolve(__dirname, 'node_modules');
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [nodeModulesPath],
  // Block local packages' node_modules to avoid duplicate dependencies
  blockList: [
    new RegExp(path.resolve(__dirname, '..', 'dario-wdk-react-native-core', 'node_modules').replace(/[/\\]/g, '[/\\\\]') + '.*'),
    new RegExp(path.resolve(__dirname, '..', 'pear-wrk-wdk', 'node_modules').replace(/[/\\]/g, '[/\\\\]') + '.*'),
  ],
};

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter(ext => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
  nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
  alias: {
    '@': path.resolve(__dirname, 'src'),
  },
  extraNodeModules: {
    stream: require.resolve('stream-browserify'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    zlib: require.resolve('browserify-zlib'),
    path: require.resolve('path-browserify'),
    process: require.resolve('process'),
    querystring: require.resolve('querystring-es3'),
    buffer: require.resolve('@craftzdog/react-native-buffer'),
    crypto: require.resolve('react-native-crypto'),
    events: require.resolve('events'),
  },
};

const originalResolveRequest = resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    const resolvedPath = moduleName.replace('@/', path.resolve(__dirname, 'src') + '/');
    try {
      return context.resolveRequest(context, resolvedPath, platform);
    } catch (e) {
      // Fall through to default resolver
    }
  }

  if (config.resolver.extraNodeModules[moduleName]) {
    return {
      filePath: config.resolver.extraNodeModules[moduleName],
      type: 'sourceFile',
    };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
