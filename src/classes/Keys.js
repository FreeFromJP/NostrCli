import { getPublicKey, generatePrivateKey } from "nostr-tools";
import { sha256 } from "js-sha256";

export class Keys {
    constructor(priv) {
        if(priv) {
            this.privkeyRaw = priv;
            this.pubkeyRaw = getPublicKey(priv);
        }else {
            this.privkeyRaw = generatePrivateKey();
            this.pubkeyRaw = getPublicKey(this.privkeyRaw);
        }
        
    }
}

export function deriveKey(
    secret,
    info,
    path,
  ) {
    // Concatenate the private key, info, and path with a separator
    const input = `${secret}:${info}:${path}`;
  
    // Use SHA-256 hash function to derive a symmetric key from the input
    const hash = sha256(input);
  
    // Take the first 64 characters of the hash for AES-256
    const hexKey = hash.slice(0, 64);
  
    // Convert the hexadecimal key to a byte array
    const byteArray = [];
    for (let i = 0; i < hexKey.length; i += 2) {
      byteArray.push(parseInt(hexKey.slice(i, i + 2), 16));
    }
  
    // Create a Uint8Array from the byte array
    const uint8Array = new Uint8Array(byteArray);
  
    return uint8Array;
  }