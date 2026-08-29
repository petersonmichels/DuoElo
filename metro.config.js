const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Permite que o Metro resolva arquivos .cjs usados pelo SDK do Firebase v10+
defaultConfig.resolver.sourceExts.push('cjs');

module.exports = defaultConfig;