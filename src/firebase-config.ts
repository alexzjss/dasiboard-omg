// ===== FIREBASE CONFIGURATION — DaSIboard TypeScript =====
// Substitua com suas credenciais do Firebase Console
// https://console.firebase.google.com/

declare const firebase: typeof import('firebase/app').default;

const firebaseConfig = {
  apiKey: 'AIzaSyDOy0T5Yc5hyoLPzJ5az7DBG9oiF1Ng2xQ',
  authDomain: 'dasiboard-db.firebaseapp.com',
  projectId: 'dasiboard-db',
  storageBucket: 'dasiboard-db.firebasestorage.app',
  messagingSenderId: '645371345193',
  appId: '1:645371345193:web:d7607767015098c82a1f38',
  measurementId: 'G-F2ZRXCV0F2',
};

// Inicializar Firebase (evita dupla inicialização)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();

// Configurar persistência de sessão
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch((err: Error) => console.error('Persistência não configurada:', err));
