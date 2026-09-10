// __tests__/hooks/usePlayGuard.test.ts
import { setDoc } from 'firebase/firestore';
import { executePlayWithGuard } from '../../src/hooks/usePlayGuard';
import { audioService } from '../../src/services/AudioService';

describe('usePlayGuard - Testes de Integração', () => {
  const mockNavigation = { navigate: jest.fn() };
  const mockShowCustomAlert = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(audioService, 'play').mockImplementation(async () => {});
  });

  test('Deve redirecionar direto para Home se o usuário tiver parceiro', async () => {
    const userData = { planType: 'duo', partnerId: 'partner_456', enableHaptics: false };

    await executePlayWithGuard({
      userData,
      userLang: 'pt-BR',
      navigation: mockNavigation,
      showCustomAlert: mockShowCustomAlert,
    });

    expect(setDoc).toHaveBeenCalled();
    expect(mockNavigation.navigate).toHaveBeenCalledWith('MainTabs', { screen: 'Home' });
    expect(mockShowCustomAlert).not.toHaveBeenCalled();
  });

  test('Deve exibir alerta de escolha (Solo x Conectar) se o plano for Duo sem parceiro', async () => {
    const userData = { planType: 'duo', partnerId: null, isSoloMode: false, enableHaptics: false };

    await executePlayWithGuard({
      userData,
      userLang: 'pt-BR',
      navigation: mockNavigation,
      showCustomAlert: mockShowCustomAlert,
    });

    expect(setDoc).toHaveBeenCalled();
    expect(mockShowCustomAlert).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'user-friends',
      '#EAB64A',
      expect.any(String),
      expect.any(Function),
      expect.any(String),
      expect.any(Function)
    );
  });
});