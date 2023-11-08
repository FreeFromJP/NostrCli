import { SimplePool } from "nostr-tools";
import { nip44 } from "nostr-tools";


function unwrapGift(prikey, event) {
  const sharedSecret = nip44.getSharedSecret(prikey, event.pubkey)
  event.content = nip44.decrypt(sharedSecret, event.content)
  return event;
}

export async function unwrap_gift(ids, relays) {
    let filter = {
        ids: ids.split(",").map((id) => decodeToRaw(id)),
      };
      let pool = new SimplePool();
      let events = await pool.list(relays, [filter]);
      events = events.map((e) => unwrapGift(priv, e));
      for (let e of events) {
        console.log("<<<", JSON.stringify(e, null, 2));
        const inner = JSON.parse(e.content);
        console.log(">>>", unwrapGift(priv, inner));
        console.log("-------------------------------------------------");
      }
      pool.close(relays);
}