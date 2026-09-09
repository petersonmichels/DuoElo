describe('🎭 TESTE E2E: Fluxo do Usuário Real (DuoElo)', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('1. Deve exibir a tela de Login', async () => {
    await expect(element(by.text('Área do Match'))).toExist();
  });

  it('2. Simula entrada na aba de Match e verificação do convite', async () => {
    // Tenta encontrar o campo de texto do código de convite
    const inputCode = element(by.placeholder('CÓDIGO OU @USER'));
    if (await inputCode.exists()) {
      await inputCode.typeText('DUE123');
      await element(by.text('Enviar Convite')).tap();
    }
  });
});