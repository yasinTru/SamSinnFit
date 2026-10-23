import { firebaseConfig } from './firebase-config.js';

// Veri katmanı: Firebase ayarlıysa Firestore'a (cihazlar arası eşitleme),
// değilse tarayıcının localStorage'ına yazar. İki depo da aynı arayüzü sunar.

const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/12.19.0';
const LOCAL_KEY = 'samsinnFitData';

export const DEFAULT_USERS = [
  { id: 'kisi1', name: 'Sema Hatun' },
  { id: 'kisi2', name: 'Ya Sin' }
];

// Yerel geliştirmede http://localhost:3000/?emulator adresi Firebase emülatörlerine bağlanır
const useEmulators = ['localhost', '127.0.0.1'].includes(location.hostname)
  && new URLSearchParams(location.search).has('emulator');

export function createStore() {
  const configured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
  return configured || useEmulators ? createCloudStore() : createLocalStore();
}

function sortEntries(entries) {
  return entries.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

// Firebase Authentication (Google) + Firestore
async function createCloudStore() {
  const [{ initializeApp }, authSdk, fs] = await Promise.all([
    import(`${FIREBASE_SDK}/firebase-app.js`),
    import(`${FIREBASE_SDK}/firebase-auth.js`),
    import(`${FIREBASE_SDK}/firebase-firestore.js`)
  ]);

  const app = initializeApp(useEmulators ? { apiKey: 'demo-key', projectId: 'demo-samsinn' } : firebaseConfig);
  const auth = authSdk.getAuth(app);
  auth.languageCode = 'tr';
  // Veriler cihazda da önbelleğe alınır; internet yokken yapılan değişiklikler bağlantı gelince gönderilir
  const db = fs.initializeFirestore(app, {
    localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() })
  });

  if (useEmulators) {
    authSdk.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  const entriesRef = fs.collection(db, 'entries');
  const peopleRef = fs.doc(db, 'settings', 'people');

  return {
    mode: 'cloud',
    onAuthChange(callback) {
      return authSdk.onAuthStateChanged(auth, user => callback(user && { email: user.email }));
    },
    signIn() {
      const provider = new authSdk.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      return authSdk.signInWithPopup(auth, provider);
    },
    signOut() {
      return authSdk.signOut(auth);
    },
    watchUsers(callback, onError) {
      return fs.onSnapshot(peopleRef, snapshot => {
        const users = snapshot.data()?.users;
        callback(Array.isArray(users) && users.length ? users : DEFAULT_USERS);
      }, onError);
    },
    watchEntries(start, end, callback, onError) {
      const range = fs.query(entriesRef, fs.where('date', '>=', start), fs.where('date', '<=', end));
      return fs.onSnapshot(range, { includeMetadataChanges: true }, snapshot => {
        const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(sortEntries(entries), { pending: snapshot.metadata.hasPendingWrites });
      }, onError);
    },
    addEntry(entry) {
      return fs.addDoc(entriesRef, { ...entry, createdAt: Date.now() });
    },
    updateEntry(id, fields) {
      return fs.updateDoc(fs.doc(entriesRef, id), { ...fields, updatedAt: Date.now() });
    },
    deleteEntry(id) {
      return fs.deleteDoc(fs.doc(entriesRef, id));
    },
    // Silinen kaydı aynı id ile geri yazar ("Geri al")
    restoreEntry({ id, ...entry }) {
      return fs.setDoc(fs.doc(entriesRef, id), entry);
    },
    saveUsers(users) {
      return fs.setDoc(peopleRef, { users });
    }
  };
}

// Firebase ayarlanmadığında: veriler sadece bu tarayıcıda
async function createLocalStore() {
  let data = load();
  const userWatchers = new Set();
  const entryWatchers = new Set();

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(LOCAL_KEY));
      return {
        users: Array.isArray(saved?.users) ? saved.users : DEFAULT_USERS,
        entries: Array.isArray(saved?.entries) ? saved.entries : []
      };
    } catch {
      return { users: DEFAULT_USERS, entries: [] };
    }
  }

  function entriesBetween(start, end) {
    return sortEntries(data.entries.filter(e => e.date >= start && e.date <= end).map(e => ({ ...e })));
  }

  function notify() {
    userWatchers.forEach(callback => callback(data.users));
    entryWatchers.forEach(w => w.callback(entriesBetween(w.start, w.end), { pending: false }));
  }

  function commit() {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch {
      // localStorage kullanılamıyorsa (ör. eski Safari gizli sekme) veriler sayfa açıkken bellekte kalır
    }
    notify();
  }

  // Aynı tarayıcıdaki diğer sekmelerde yapılan değişiklikleri yansıt
  window.addEventListener('storage', (e) => {
    if (e.key === LOCAL_KEY) {
      data = load();
      notify();
    }
  });

  return {
    mode: 'local',
    onAuthChange(callback) {
      callback({ email: null });
    },
    async signIn() {},
    async signOut() {},
    watchUsers(callback) {
      userWatchers.add(callback);
      callback(data.users);
      return () => userWatchers.delete(callback);
    },
    watchEntries(start, end, callback) {
      const watcher = { start, end, callback };
      entryWatchers.add(watcher);
      callback(entriesBetween(start, end), { pending: false });
      return () => entryWatchers.delete(watcher);
    },
    async addEntry(entry) {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      data.entries.push({ ...entry, id, createdAt: Date.now() });
      commit();
    },
    async updateEntry(id, fields) {
      data.entries = data.entries.map(e => (e.id === id ? { ...e, ...fields, updatedAt: Date.now() } : e));
      commit();
    },
    async deleteEntry(id) {
      data.entries = data.entries.filter(e => e.id !== id);
      commit();
    },
    async restoreEntry(entry) {
      data.entries.push({ ...entry });
      commit();
    },
    async saveUsers(users) {
      data.users = users;
      commit();
    }
  };
}
