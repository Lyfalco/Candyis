import { Platform } from 'react-native';
import { getAuth, initializeAuth, Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseApp } from './config';

// `getReactNativePersistence` ships in the "react-native" build of firebase/auth
// (resolved by Metro) but isn't in the package's public TypeScript defs, so it's
// pulled in via require() to sidestep the type-checker rather than the module system.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getReactNativePersistence } = require('firebase/auth');

// Web (browser) persistence works out of the box with getAuth(); native iOS/Android
// needs an explicit AsyncStorage-backed persistence adapter or sessions won't survive restarts.
export const auth: Auth =
  Platform.OS === 'web'
    ? getAuth(firebaseApp)
    : initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });
