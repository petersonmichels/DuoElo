// 🎯 Define as portas do emulador ANTES do import do @firebase/rules-unit-testing
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8088";
process.env.FIREBASE_EMULATOR_HUB = "127.0.0.1:4400";

jest.unmock("firebase/firestore");
jest.unmock("firebase/app");
jest.unmock("firebase/auth");

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, test } from "@jest/globals";
import * as fs from "fs";

describe("🛡️ PENTEST: Bateria Expandida de Segurança do Firestore (DuoElo)", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const rulesPath = "firestore.rules";
    const rules = fs.existsSync(rulesPath)
      ? fs.readFileSync(rulesPath, "utf8")
      : undefined;

    testEnv = await initializeTestEnvironment({
      projectId: "demo-duoelo-test",
      firestore: {
        host: "127.0.0.1",
        port: 8088,
        rules: rules,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    // Tenta limpar o Firestore via SDK, ignorando falha de Hub
    try {
      if (testEnv) {
        await testEnv.clearFirestore();
      }
    } catch (e) {
      // Ignora erro de comunicação com o Hub se o emulador já estiver isolado
    }
  });

  // --- 1. AUTENTICAÇÃO E ISOLAMENTO DE DADOS ---

  test("1. HACKER: Bloqueia leitura e escrita sem autenticação", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const victimJournal = unauthDb.doc("users/victim_1/journals/entry_1");
    const victimUser = unauthDb.doc("users/victim_1");

    await assertFails(victimJournal.get());
    await assertFails(victimUser.set({ billingFirstName: "Hacked" }));
  });

  test("2. USUÁRIO AUTÊNTICO: Permite leitura e atualização do próprio perfil", async () => {
    const validDb = testEnv.authenticatedContext("user_auth_1").firestore();
    const myRef = validDb.doc("users/user_auth_1");

    await assertSucceeds(myRef.get());
    await assertSucceeds(
      myRef.set({ billingFirstName: "Gabriel", hasCompletedAnamnesis: true })
    );
  });

  // --- 2. PRIVILÉGIOS E MONETIZAÇÃO ---

  test("3. HACKER: Bloqueia forjamento de plano Premium em conta própria ou de terceiros", async () => {
    const hackerDb = testEnv.authenticatedContext("hacker_2").firestore();
    const victimRef = hackerDb.doc("users/victim_2");
    const selfRef = hackerDb.doc("users/hacker_2");

    await assertFails(victimRef.update({ isPremium: true, planType: "duo" }));
    await assertFails(selfRef.update({ isPremium: true }));
  });

  // --- 3. PRIVACIDADE E DIÁRIOS ENCRIPTADOS ---

  test("4. HACKER / PARCEIRO: Bloqueia leitura de diários confidenciais de outros perfis", async () => {
    const hackerDb = testEnv.authenticatedContext("hacker_3").firestore();
    const journalRef = hackerDb.doc("users/partner_3/journals/day_10");

    await assertFails(journalRef.get());
  });

  test("5. USUÁRIO AUTÊNTICO: Permite criar e ler os próprios diários", async () => {
    const userDb = testEnv.authenticatedContext("user_auth_2").firestore();
    const myJournalRef = userDb.doc("users/user_auth_2/journals/day_10");

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

  test("6. HACKER: Bloqueia vínculo forçado de partnerId não autorizado", async () => {
    const hackerDb = testEnv.authenticatedContext("hacker_4").firestore();
    const victimRef = hackerDb.doc("users/victim_4");

    await assertFails(
      victimRef.update({ partnerId: "hacker_4", hasPartner: true })
    );
  });

  // --- 5. ESCALAÇÃO DE PRIVILÉGIOS E AUDITORIA ---

  test("7. HACKER: Bloqueia atribuição de papéis administrativos (isAdmin / role)", async () => {
    const hackerDb = testEnv.authenticatedContext("hacker_5").firestore();
    const selfRef = hackerDb.doc("users/hacker_5");

    await assertFails(selfRef.update({ role: "admin", isAdmin: true }));
  });

  test("8. HACKER: Bloqueia deleção de perfis alheios", async () => {
    const hackerDb = testEnv.authenticatedContext("hacker_6").firestore();
    const victimRef = hackerDb.doc("users/victim_6");

    await assertFails(victimRef.delete());
  });
});