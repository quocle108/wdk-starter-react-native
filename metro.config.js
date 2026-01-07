const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

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
