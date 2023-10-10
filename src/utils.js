import { nip19, nip04, getPublicKey, nip44 } from "nostr-tools";

export function decodeToRaw(s) {
  if (s.startsWith("nostr:")) {
    s = s.slice(6);
  }
  if (s.startsWith("n")) {
    let t = nip19.decode(s).data;
    if (t.id) {
      s = t.id;
    } else {
      s = t;
    }
  }
  return s;
}

const KINDS_TO_BE_DECRYPTED = [4, 1404];

export async function decryptIfNecessary(prikey, event) {
  if (KINDS_TO_BE_DECRYPTED.includes(event.kind)) {
    let myPubKey = getPublicKey(prikey);
    const eventPubKey = event.pubkey;
    const pTagKey = event.tags.filter((t) => t[0] == "p")[0][1];
    if (eventPubKey == myPubKey) {
      event.content = await nip04.decrypt(
        prikey,
        pTagKey,
        event.content
      );
    } else if (pTagKey == myPubKey) {
      event.content = await nip04.decrypt(prikey, eventPubKey, event.content);
    }
  }
  return event;
}

export function unwrapGift(prikey, event) {
  const sharedSecret = nip44.getSharedSecret(prikey, event.pubkey)
  event.content = nip44.decrypt(sharedSecret, event.content)
  return event;
}

export function logEvents(events) {
  events.forEach(element => {
    element.created_at = formatDate(element.created_at)
  });
  console.log(JSON.stringify(events, null, 2));
}

function formatDate(timestamp) {
  const date = new Date(timestamp * 1000); // Convert to milliseconds
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed in JavaScript
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
