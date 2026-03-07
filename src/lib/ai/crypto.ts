/**
 * Crypto Utility - AES-GCM encryption for API keys at rest
 *
 * Uses Web Crypto API to encrypt API keys before storing in IndexedDB.
 * The encryption key is stored in localStorage as raw key material.
 * This provides defense-in-depth: keys in IndexedDB are not plaintext
 * even if someone reads the DB directly.
 */

const CRYPTO_KEY_STORAGE = 'paddock_crypto_key';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM

/**
 * Get or create the CryptoKey used for encrypting API keys.
 * Raw key material is persisted in localStorage.
 */
async function getCryptoKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(CRYPTO_KEY_STORAGE);

  if (stored) {
    const rawKey = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey('raw', rawKey, ALGORITHM, true, [
      'encrypt',
      'decrypt',
    ]);
  }

  // Generate a new key
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );

  // Export and store raw key material
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
  localStorage.setItem(CRYPTO_KEY_STORAGE, b64);

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
