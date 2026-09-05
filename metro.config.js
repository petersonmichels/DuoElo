const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Garante a resolução de arquivos .cjs (Firebase v10+) sem duplicar extensões
config.resolver.sourceExts = Array.from(
  new Set([...config.resolver.sourceExts, 'cjs'])
);

module.exports = config;