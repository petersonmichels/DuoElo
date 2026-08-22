const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Permite que o Metro resolva arquivos .cjs usados pelo SDK do Firebase v10+
config.resolver.sourceExts.push('cjs');

module.exports = config;