// jest.setup.js
import '@testing-library/jest-native/extend-expect';

// Banco de dados em memória dinâmico para os testes E2E
const mockFirestoreStore = {};

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    volume: 1,
    play: jest.fn(),
  })),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Mocks Dinâmicos do Firestore com Normalização de Path
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((...args) => {
    // Filtra objetos (db) e junta todas as strings de coleção/id
    const pathSegments = args.filter((arg) => typeof arg === 'string');
    return pathSegments.join('/');
  }),
  getDoc: jest.fn((docPath) => {
    const data = mockFirestoreStore[docPath] || null;
    return Promise.resolve({
      exists: () => !!data,
      data: () => data,
    });
  }),
  getDocs: jest.fn(() =>
    Promise.resolve({
      empty: false,
      docs: [],
      forEach: jest.fn(),
    })
  ),
  setDoc: jest.fn((docPath, newData, options) => {
    if (options && options.merge && mockFirestoreStore[docPath]) {
      mockFirestoreStore[docPath] = {
        ...mockFirestoreStore[docPath],
        ...newData,
      };
    } else {
      mockFirestoreStore[docPath] = { ...newData };
    }
    return Promise.resolve();
  }),
  deleteDoc: jest.fn((docPath) => {
    delete mockFirestoreStore[docPath];
    return Promise.resolve();
  }),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock_audit_doc_123' })),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  increment: jest.fn((val) => val),
  onSnapshot: jest.fn(() => jest.fn()),
}));

// Mocks do Firebase Auth
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback({ uid: 'user_test_123', email: 'test@duoelo.lu' });
    return jest.fn();
  }),
  signInWithEmailAndPassword: jest.fn((auth, email) =>
    Promise.resolve({ user: { uid: `uid_${email.replace(/[^a-zA-Z0-9]/g, '')}` } })
  ),
  createUserWithEmailAndPassword: jest.fn((auth, email) =>
    Promise.resolve({ user: { uid: `uid_${email.replace(/[^a-zA-Z0-9]/g, '')}` } })
  ),
}));

// Mock da Configuração do Firebase
jest.mock('./src/config/firebase', () => ({
  auth: {
    currentUser: { uid: 'user_test_123', email: 'test@duoelo.lu' },
    onAuthStateChanged: jest.fn(),
  },
  db: {},
  authControls: { isCreatingAccount: false },
}));