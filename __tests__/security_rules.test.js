const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");

describe("🛡️ PENTEST: Bateria Expandida de Segurança do Firestore (DuoElo)", () => {
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

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  // --- 1. AUTENTICAÇÃO E ISOLAMENTO DE DADOS ---

  it("1. HACKER: Bloqueia leitura e escrita sem autenticação", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const victimJournal = unauthDb.doc("users/victim_uid/journals/entry_1");
    const victimUser = unauthDb.doc("users/victim_uid");

    await assertFails(victimJournal.get());
    await assertFails(victimUser.set({ billingFirstName: "Hacked" }));
  });

  it("2. USUÁRIO AUTÊNTICO: Permite leitura e atualização do próprio perfil", async () => {
    const validDb = testEnv.authenticatedContext("user_123").firestore();
    const myRef = validDb.doc("users/user_123");

    await assertSucceeds(myRef.get());
    await assertSucceeds(myRef.set({ billingFirstName: "Gabriel", hasCompletedAnamnesis: true }));
  });

  // --- 2. PRIVILÉGIOS E MONETIZAÇÃO ---

  it("3. HACKER: Bloqueia forjamento de plano Premium em conta própria ou de terceiros", async () => {
    const hackerDb = testEnv.authenticatedContext("hacker_uid").firestore();
    const victimRef = hackerDb.doc("users/victim_uid");
    const selfRef = hackerDb.doc("users/hacker_uid");

    // Bloqueia alterar a vítima
    await assertFails(victimRef.update({ isPremium: true, planType: "duo" }));
    // Bloqueia injetar flag isPremium diretamente sem webhook de pagamento
    await assertFails(selfRef.update({ isPremium: true }));
  });

  // --- 3. PRIVACIDADE E DIÁRIOS ENCRIPTADOS ---

  it("4. HACKER / PARCEIRO: Bloqueia leitura de diários confidenciais de outros perfis", async () => {
    const hackerDb = testEnv.authenticatedContext("hacker_uid").firestore();
    const journalRef = hackerDb.doc("users/partner_uid/journals/day_10");

    await assertFails(journalRef.get());
  });

  it("5. USUÁRIO AUTÊNTICO: Permite criar e ler os próprios diários", async () => {
    const userDb = testEnv.authenticatedContext("user_123").firestore();
    const myJournalRef = userDb.doc("users/user_123/journals/day_10");

    await assertSucceeds(
      myJournalRef.set({
        phase: 10,
        text: "crypto_payload_string",
        date: new Date().toISOString(),
      })
    );
    await assertSucceeds(myJournalRef.get());
  });

  // --- 4. PAREAMENTO (MATCH) E INTEGRIDADE DE PARCERIA ---

  it("6. HACKER: Bloqueia vínculo forçado de partnerId não autorizado", async () => {
    const hackerDb = testEnv.authenticatedContext("hacker_uid").firestore();
    const victimRef = hackerDb.doc("users/victim_uid");

    // Tentar setar a si mesmo como parceiro na conta da vítima
    await assertFails(victimRef.update({ partnerId: "hacker_uid", hasPartner: true }));
  });

  // --- 5. ESCALAÇÃO DE PRIVILÉGIOS E AUDITORIA ---

  it("7. HACKER: Bloqueia atribuição de papéis administrativos (isAdmin / role)", async () => {
    const hackerDb = testEnv.authenticatedContext("hacker_uid").firestore();
    const selfRef = hackerDb.doc("users/hacker_uid");

    await assertFails(selfRef.update({ role: "admin", isAdmin: true }));
  });

  it("8. HACKER: Bloqueia deleção de perfis alheios", async () => {
    const hackerDb = testEnv.authenticatedContext("hacker_uid").firestore();
    const victimRef = hackerDb.doc("users/victim_uid");

    await assertFails(victimRef.delete());
  });
});