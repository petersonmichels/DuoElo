# DuoElo 👩‍❤️‍👨 — Aplicativo de Fortalecimento de Vínculos de Casais

Plataforma mobile multilíngue desenvolvida em React Native / Expo SDK 57 para casais, integrando gamificação de relacionamentos, trilha de tarefas de 90 dias, loja de vales e **Diário com Criptografia de Ponta a Ponta (E2EE) Zero-Knowledge**.

---

## 🛡️ Arquitetura de Segurança & Compliance Global

O DuoElo foi projetado sob os princípios de **Privacy by Design** e **Security by Default**, atendendo rigorosamente às legislações de proteção de dados:
* **GDPR (União Europeia)** — Autoridade de Controle da CNPD (Luxemburgo).
* **LGPD (Brasil)** — Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
* **APPI (Japão)** — Act on the Protection of Personal Information (PPC Japão).

### Módulos de Segurança Ativos
1. **Zero-Knowledge E2EE (`src/services/securityService.ts`):** Conteúdos sensíveis do Diário do Casal são encriptados localmente no dispositivo usando o algoritmo **AES-256** derivado de uma Senha Mestra local. A empresa **BARNX S.A R.L.-S** e o banco de dados Firestore não possuem acesso às chaves de decodificação.
2. **Hardware Key Storage:** Armazenamento seguro de tokens e sal de chave no hardware nativo através do **iOS Keychain** e **Android Keystore** (`expo-secure-store`).
3. **Audit Trail Imutável (`src/services/auditService.ts`):** Registros de consentimento (EULA) e requisições de exclusão de conta armazenados com hash imutável sem exposição de dados PII (Personally Identifiable Information).
4. **Sentry PII Stripping (`App.tsx`):** Sanitização em tempo de execução para remoção automática de e-mails e identificadores sensíveis em relatórios de exceções.

---

## 🏢 Dados da Entidade Operadora
* **Razão Social:** BARNX S.A R.L.-S
* **Jurisdição:** Grão-Ducado de Luxemburgo
* **Suporte / Privacidade:** privacy@duoelo.lu
* **Página Jurídica Oficial:** https://duoelo.lu/terms

---

## 🚀 Execução do Projeto e Builds

### 1. Instalar Dependências
```bash
npm install