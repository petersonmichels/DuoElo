// __tests__/services/AudioService.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer } from 'expo-audio';
import { audioService } from '../../src/services/AudioService';

describe('AudioService - Testes Unitários', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  test('Deve inicializar habilitado por padrão caso não haja chave salva', async () => {
    const isEnabled = await audioService.init();
    expect(isEnabled).toBe(true);
    expect(audioService.getSfxEnabled()).toBe(true);
  });

  test('Deve respeitar a preferência Mute salva no AsyncStorage', async () => {
    await AsyncStorage.setItem('@duoelo:sfx_enabled', 'false');
    const isEnabled = await audioService.init();

    expect(isEnabled).toBe(false);
    expect(audioService.getSfxEnabled()).toBe(false);
  });

  test('NÃO deve tocar som quando o SFX estiver desativado', async () => {
    await audioService.setSfxEnabled(false);
    await audioService.play('click');

    expect(createAudioPlayer).not.toHaveBeenCalled();
  });

  test('Deve tocar som corretamente quando o SFX estiver ativado', async () => {
    await audioService.setSfxEnabled(true);
    await audioService.play('click');

    expect(createAudioPlayer).toHaveBeenCalled();
  });
});