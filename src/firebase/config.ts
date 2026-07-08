import { initializeApp, getApps, getApp } from 'firebase/app';

/**
 * Firebase project: "Candy Blocks" (candy-blocks-3012a), Spark (free) plan.
 * The apiKey below is safe to ship in client code — Firebase access is
 * controlled by Firestore/Auth security rules, not by hiding this value.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyCbAUHVJ6I4gOdgcfP9v-A05QBF67QFKJA',
  authDomain: 'candy-blocks-3012a.firebaseapp.com',
  projectId: 'candy-blocks-3012a',
  storageBucket: 'candy-blocks-3012a.firebasestorage.app',
  messagingSenderId: '439475416423',
  appId: '1:439475416423:web:2d82938f497a55ac39d3c2',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
