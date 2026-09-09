import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer } from 'expo-audio';
import { Platform, TouchableOpacity } from 'react-native';

const SFX_STORAGE_KEY = '@duoelo:sfx_enabled';

const SFX_SOURCES = {
  click: require('../../assets/sounds/click.mp3'),
  success: require('../../assets/sounds/success.mp3'),
  match: require('../../assets/sounds/match.mp3'),
};

export type SoundEffect = keyof typeof SFX_SOURCES;

class AudioService {
  private isSfxEnabled: boolean = true;

  async init(): Promise<boolean> {
    try {
      const savedPreference = await AsyncStorage.getItem(SFX_STORAGE_KEY);
      if (savedPreference !== null) {
        this.isSfxEnabled = savedPreference === 'true';
      }
    } catch (error) {
      console.warn('[AudioService] Erro ao carregar preferências de som:', error);
    }
    this.applyNativeSoundSettings(this.isSfxEnabled);
    return this.isSfxEnabled;
  }

  async setSfxEnabled(enabled: boolean) {
    this.isSfxEnabled = Boolean(enabled);
    this.applyNativeSoundSettings(this.isSfxEnabled);
    try {
      await AsyncStorage.setItem(SFX_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch (error) {
      console.warn('[AudioService] Erro ao salvar preferência de SFX:', error);
    }
  }

  // 🛡️ MUTA O "TOK TOK" NATIVO DO ANDROID NOS COMPONENTES TOUCH
  private applyNativeSoundSettings(enabled: boolean) {
    if (Platform.OS === 'android') {
      try {
        (TouchableOpacity as any).defaultProps = {
          ...(TouchableOpacity as any).defaultProps,
          soundEnabled: enabled,
        };
      } catch (e) {}
    }
  }

  getSfxEnabled(): boolean {
    return this.isSfxEnabled;
  }

  async play(sfxName: SoundEffect) {
    if (!this.isSfxEnabled) {
      return;
    }

    try {
      const source = SFX_SOURCES[sfxName];
      if (source) {
        const player = createAudioPlayer(source);
        player.volume = 0.4;
        player.play();
      }
    } catch (error) {
      // Silencioso
    }
  }
}

export const audioService = new AudioService();