// Finto Firestore: registra ogni scrittura invece di andare in rete.
jest.mock("../src/services/firebase", () => ({
  db: {}, auth: {}, storage: {},
}));

global.__SCRITTURE__ = [];

jest.mock("firebase/firestore", () => ({
  collection: (_db, nome) => ({ __nome: nome }),
  doc: (_db, nome, id) => ({ __nome: nome, __id: id }),
  addDoc: jest.fn(async (ref, dati) => {
    global.__SCRITTURE__.push({ tipo: "crea", collezione: ref.__nome, dati });
    return { id: "doc-finto-" + global.__SCRITTURE__.length };
  }),
  updateDoc: jest.fn(async (ref, dati) => {
    global.__SCRITTURE__.push({ tipo: "aggiorna", collezione: ref.__nome, dati });
  }),
  deleteDoc: jest.fn(async () => {}),
  setDoc: jest.fn(async () => {}),
  getDoc: jest.fn(async () => ({ exists: () => false, data: () => ({}) })),
  getDocs: jest.fn(async () => ({ docs: [] })),
  query: (...a) => a,
  where: (...a) => a,
  orderBy: (...a) => a,
  limit: (...a) => a,
  onSnapshot: jest.fn((_q, cb) => {
    // Vale sia per le query (docs) sia per il singolo documento (exists/data)
    if (typeof cb === "function") {
      cb({ docs: [], empty: true, exists: () => false, data: () => ({}), id: "doc-finto" });
    }
    return () => {};
  }),
  serverTimestamp: () => Date.now(),
  arrayUnion: (...a) => a,
  arrayRemove: (...a) => a,
  Timestamp: { now: () => ({ toMillis: () => Date.now() }) },
}));

jest.mock("../src/hooks/useHousehold", () => ({
  useHousehold: () => ({
    profile: { id: "utente-1", email: "test@test.it", displayName: "Test",
               householdId: "casa-1", householdIds: ["casa-1"], createdAt: 0 },
    isLoading: false,
  }),
  HouseholdProvider: ({ children }) => children,
}));

jest.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({ user: { uid: "utente-1", email: "test@test.it" }, isLoading: false }),
  AuthProvider: ({ children }) => children,
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "id-finto" }),
  useSegments: () => [],
  useRootNavigationState: () => ({ key: "k" }),
  Stack: Object.assign(({ children }) => children, { Screen: () => null }),
  Tabs: Object.assign(({ children }) => children, { Screen: () => null }),
  Link: ({ children }) => children,
}));

jest.mock("firebase/functions", () => ({
  getFunctions: () => ({}),
  httpsCallable: () => jest.fn(async () => ({ data: {} })),
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
