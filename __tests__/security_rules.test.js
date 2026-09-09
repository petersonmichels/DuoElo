const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");

describe("🛡️ PENTEST: Simulação de Ataque e Segurança do Firestore", () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "duoelo-security-test",
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  it("1. HACKER: Bloqueia leitura de dados e diários sem autenticação", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const hackerAttempt = unauthDb.doc("users/victim_uid/journals/entry_1");

    await assertFails(hackerAttempt.get());
  });

  it("2. HACKER: Bloqueia tentativa de alterar plano Premium de outro perfil", async () => {
    const hackerDb = testEnv.authenticatedContext("hacker_uid").firestore();
    const victimRef = hackerDb.doc("users/victim_uid");

    await assertFails(victimRef.update({ isPremium: true, planType: "duo" }));
  });

  it("3. USUÁRIO AUTÊNTICO: Permite leitura do próprio documento", async () => {
    const validDb = testEnv.authenticatedContext("user_123").firestore();
    const myRef = validDb.doc("users/user_123");

    await assertSucceeds(myRef.get());
  });
});