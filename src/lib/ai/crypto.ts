/**
 * Crypto Utility - AES-GCM encryption for API keys at rest
 *
 * Uses Web Crypto API to encrypt API keys before storing in IndexedDB.
 * The CryptoKey is stored as a non-extractable key in a dedicated IDB store.
 * Non-extractable keys cannot have their raw material read via exportKey(),
 * which means even XSS cannot exfiltrate the key bytes -- they can only
 * use the key through the Web Crypto API while the page is open.
 */

const CRYPTO_KEY_DB_NAME = 'paddock_crypto_keys';
const CRYPTO_KEY_DB_VERSION = 1;
const CRYPTO_KEY_STORE = 'keys';
const CRYPTO_KEY_ID = 'master';

// Legacy localStorage key (for migration only)
const LEGACY_CRYPTO_KEY_STORAGE = 'paddock_crypto_key';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM

// In-memory cache to avoid repeated IDB reads within a session
let cachedKey: CryptoKey | null = null;

/**
 * Open (or create) the dedicated IDB database for CryptoKey storage.
 */
function openCryptoKeyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CRYPTO_KEY_DB_NAME, CRYPTO_KEY_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CRYPTO_KEY_STORE)) {
        db.createObjectStore(CRYPTO_KEY_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Read CryptoKey from dedicated IDB store.
 */
async function readKeyFromIdb(): Promise<CryptoKey | null> {
  const db = await openCryptoKeyDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CRYPTO_KEY_STORE, 'readonly');
    const store = tx.objectStore(CRYPTO_KEY_STORE);
    const request = store.get(CRYPTO_KEY_ID);

    request.onsuccess = () => {
      db.close();
      resolve(request.result ?? null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Write CryptoKey to dedicated IDB store.
 */
async function writeKeyToIdb(key: CryptoKey): Promise<void> {
  const db = await openCryptoKeyDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CRYPTO_KEY_STORE, 'readwrite');
    const store = tx.objectStore(CRYPTO_KEY_STORE);
    const request = store.put(key, CRYPTO_KEY_ID);

    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Migrate a legacy localStorage key into IDB as a non-extractable key.
 * After successful migration the localStorage entry is removed.
 */
async function migrateLegacyKey(): Promise<CryptoKey | null> {
  const stored = localStorage.getItem(LEGACY_CRYPTO_KEY_STORAGE);
  if (!stored) return null;

  try {
    const rawKey = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    // Import the raw material as a NEW non-extractable key
    const key = await crypto.subtle.importKey('raw', rawKey, ALGORITHM, false, [
      'encrypt',
      'decrypt',
    ]);

    // Persist to IDB and remove legacy storage
    await writeKeyToIdb(key);
    localStorage.removeItem(LEGACY_CRYPTO_KEY_STORAGE);

    return key;
  } catch {
    // If migration fails (corrupted data, etc.) just remove the bad entry
    localStorage.removeItem(LEGACY_CRYPTO_KEY_STORAGE);
    return null;
  }
}

/**
 * Get or create the CryptoKey used for encrypting API keys.
 * The key is non-extractable and stored in a dedicated IDB database.
 */
async function getCryptoKey(): Promise<CryptoKey> {
  // 1. Return cached key if available
  if (cachedKey) return cachedKey;

  // 2. Try to load from IDB
  const idbKey = await readKeyFromIdb();
  if (idbKey) {
    cachedKey = idbKey;
    return idbKey;
  }

  // 3. Attempt migration from legacy localStorage
  const migratedKey = await migrateLegacyKey();
  if (migratedKey) {
    cachedKey = migratedKey;
    return migratedKey;
  }

  // 4. Generate a brand-new non-extractable key
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );

  await writeKeyToIdb(key);
  cachedKey = key;

  return key;
}

/**
 * Encrypt a plaintext string using AES-GCM.
 * Returns a base64 string containing IV + ciphertext.
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  // Combine IV + ciphertext into a single buffer
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64 string (IV + ciphertext) back to plaintext.
 */
export async function decrypt(encrypted: string): Promise<string> {
  const key = await getCryptoKey();
  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Check if a stored value looks like it's already encrypted (base64 with sufficient length).
 * Plaintext API keys typically start with known prefixes (sk-, AIza, etc.)
 * and are not valid base64 of the expected encrypted format.
 */
export function isEncrypted(value: string): boolean {
  // Encrypted values are base64 and at least IV_LENGTH + some ciphertext long
  // A 12-byte IV + even a short ciphertext will produce base64 longer than typical key prefixes
  try {
    const decoded = atob(value);
    // Encrypted values will be at least IV (12 bytes) + 1 byte ciphertext + 16 byte auth tag
    return decoded.length >= IV_LENGTH + 17;
  } catch {
    // Not valid base64, so not encrypted
    return false;
  }
}
