import { nip44 } from 'nostr-tools';

export function splitJson(jsonObject, shares) {
  const jsonString = JSON.stringify(jsonObject);
  const shareLength = Math.ceil(jsonString.length / shares);
  const jsonShares = [];

  for (let i = 0; i < shares; i++) {
    const start = i * shareLength;
    const end = start + shareLength;
    const jsonShare = jsonString.slice(start, end);
    jsonShares.push(jsonShare);
  }

  return jsonShares;
}

export function reassembleJson(shares) {
  const jsonString = shares.join('');
  const jsonObject = JSON.parse(jsonString);
  return jsonObject;
}

export function splitJsonEncrypted(jsonObject, secret, shares) {
  const jsonString = JSON.stringify(jsonObject);
  const encryptedContent = nip44.encrypt(secret, jsonString);
  const shareLength = Math.ceil(encryptedContent.length / shares);
  const jsonShares = [];

  for (let i = 0; i < shares; i++) {
    const start = i * shareLength;
    const end = start + shareLength;
    const jsonShare = encryptedContent.slice(start, end);
    jsonShares.push(jsonShare);
  }

  return jsonShares;
}

export function reassembleJsonDecrypted(encryptedShares, secret) {
  const concatedString = encryptedShares.join('');
  try {
    const decryptedContent = nip44.decrypt(secret, concatedString);
    const jsonObject = JSON.parse(decryptedContent);
    return jsonObject;
  } catch (error) {
    console.error('error when reassemble data', error);
    return null;
  }
}