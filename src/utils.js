import { nip19, nip04, getPublicKey } from "nostr-tools";

export function decodeToRaw(s) {
  if (s.startsWith("nostr:")) {
    s = s.slice(6);
  }
  if (s.startsWith("n")) {
    let t = nip19.decode(s).data;
    if (t.s) {
      s = t.s;
    } else {
      s = t;
    }
  }
  return s;
}

const KINDS_TO_BE_DECRYPTED = [4];

export async function decryptIfNecessary(prikey, event) {
  if (KINDS_TO_BE_DECRYPTED.includes(event.kind)) {
    let pub = getPublicKey(prikey);
    if (pub == event.pubkey) {
      const counterPartyPubkey = event.tags.filter(t => t[0] == "p")[0][1];
      const decryptedContent = await nip04.decrypt(
        prikey,
        counterPartyPubkey,
        event.content
      );
      event.content = decryptedContent;
    }
  }
  return event;
}
