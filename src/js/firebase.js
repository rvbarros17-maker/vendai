import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

// TODO: troque pelas credenciais do SEU projeto Firebase
// (Firebase Console > Configurações do projeto > Seus apps > SDK config)
const firebaseConfig = {
  apiKey: "AIzaSyDmY3QCwC151QQB3puB86FLroK1NvYHeJg",
  authDomain: "vendai-b4727.firebaseapp.com",
  projectId: "vendai-b4727",
  storageBucket: "vendai-b4727.firebasestorage.app",
  messagingSenderId: "28505351089",
  appId: "1:28505351089:web:a3651b57ae07c7ccea9390",
};

export const app = initializeApp(firebaseConfig);

// Cache local persistente = o app funciona 100% offline.
// O Firestore guarda tudo no dispositivo e sincroniza sozinho quando a
// internet volta. multiTabManager permite abrir em mais de uma aba/dispositivo.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
