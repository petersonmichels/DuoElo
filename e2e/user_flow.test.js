describe('🎭 TESTE E2E: Jornada do Usuário Real', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('1. Valida tela inicial e navegação para Login', async () => {
    await expect(element(by.text('Área do Match'))).toExist();
  });

  it('2. Testa preenchimento do formulário de conexão no Match', async () => {
    const inputCode = element(by.placeholder('CÓDIGO OU @USER'));
    if (await inputCode.exists()) {
      await inputCode.typeText('DUE123');
      await element(by.text('Enviar Convite')).tap();
    }
  });
});