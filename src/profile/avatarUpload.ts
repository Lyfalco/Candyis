import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase/storage';

/** Small on purpose — this is an avatar shown at ~30-80px everywhere it appears (profile card, leaderboard rows), so there's no benefit to storing (or re-downloading) anything larger. */
const AVATAR_DIMENSION = 256;
const AVATAR_JPEG_QUALITY = 0.7;

/** Hard ceiling on the whole upload — without this, a stalled network call (or a misconfigured Storage bucket/rules that never rejects) leaves the caller's "uploading" spinner stuck forever with no error and no way out. */
const UPLOAD_TIMEOUT_MS = 20000;

export type PickAvatarResult = { uri: string } | { canceled: true };

/** Opens the photo library, lets the user crop to a square, and returns the picked (not yet uploaded) local URI. */
export async function pickAvatarImage(): Promise<PickAvatarResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library access was denied.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  });
  if (result.canceled || result.assets.length === 0) return { canceled: true };
  return { uri: result.assets[0].uri };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Upload timed out — check your connection and try again.')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Resizes/compresses down to a small square JPEG, then uploads it to Storage
 * under this user's own path, returning the public download URL to store on
 * the profile.
 *
 * Reads the manipulated file's bytes directly via expo-file-system's `File`
 * (an `ArrayBuffer`) rather than `fetch(uri).blob()` — the fetch+Blob path is
 * a known hang point for local `file://` URIs on React Native: the Firebase
 * Storage SDK's `uploadBytes` call can sit forever with no resolve/reject,
 * which is exactly the "stuck spinner" this was rewritten to fix. Also
 * wrapped in `withTimeout` as a hard backstop against ANY future stall,
 * network- or Storage-rules-related.
 */
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  return withTimeout(uploadAvatarInner(userId, localUri), UPLOAD_TIMEOUT_MS);
}

async function uploadAvatarInner(userId: string, localUri: string): Promise<string> {
  const manipulated = await manipulateAsync(
    localUri,
    [{ resize: { width: AVATAR_DIMENSION, height: AVATAR_DIMENSION } }],
    { compress: AVATAR_JPEG_QUALITY, format: SaveFormat.JPEG },
  );

  const file = new File(manipulated.uri);
  const bytes = await file.arrayBuffer();

  const avatarRef = ref(storage, `avatars/${userId}.jpg`);
  await uploadBytes(avatarRef, bytes, { contentType: 'image/jpeg' });
  return getDownloadURL(avatarRef);
}
