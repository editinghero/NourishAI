const ALGO = "AES-GCM";

function uint8ToBase64(u8Arr: Uint8Array) {
  let str = "";
  for (let i = 0; i < u8Arr.length; i++) {
    str += String.fromCharCode(u8Arr[i]);
  }
  return btoa(str);
}

function base64ToUint8(b64: string) {
  const str = atob(b64);
  const u8Arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    u8Arr[i] = str.charCodeAt(i);
  }
  return u8Arr;
}

const getSecretKey = async (secretOverride?: string) => {
  const secret = secretOverride || "default_secret_key_needs_32_bytes";
  const buffer = new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32));
  return await crypto.subtle.importKey("raw", buffer, ALGO, false, [
    "encrypt",
    "decrypt",
  ]);
};

export async function encryptKey(
  text: string,
  secret?: string,
): Promise<string> {
  if (!text) return "";
  const key = await getSecretKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const cipher = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded);

  const cipherBytes = new Uint8Array(cipher);
  const result = new Uint8Array(iv.length + cipherBytes.length);
  result.set(iv, 0);
  result.set(cipherBytes, iv.length);
  return uint8ToBase64(result);
}

export async function decryptKey(
  encrypted: string,
  secret?: string,
): Promise<string> {
  if (!encrypted) return "";
  const key = await getSecretKey(secret);
  const data = base64ToUint8(encrypted);
  const iv = data.slice(0, 12);
  const cipher = data.slice(12);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      cipher,
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error("Decryption failed", e);
    return "";
  }
}
