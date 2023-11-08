import { getTags, timeout } from "../utils.js";
import { relayInit } from "nostr-tools";
import { getEventHash, getSignature } from "nostr-tools";

const TIMEOUT_DURATION = 3000; // 5 seconds, adjust as needed

async function sendBySingleRelay(r, e) {
    try {
      console.log(`try to publish to relay: ${r}`);
      const relay = relayInit(r);
      await timeout(TIMEOUT_DURATION, relay.connect());
      await timeout(TIMEOUT_DURATION, relay.publish(e));
      console.log(`published by relay: ${r}`);
      relay.close();
    } catch (error) {
      console.log(`----publish error by relay ${r}:`, error);
    }
  }

export async function publish(kind, content, addTags, relays) {
    let tags = [];
        if (addTags) {
          tags = await getTags();
        }
        let event = {
          created_at: Math.round(Date.now() / 1000),
          content: content,
          pubkey: pub,
          kind: Number.parseInt(kind),
          tags: [],
        };
        if (tags.length > 0) {
          event.tags = tags;
        }

        event.id = getEventHash(event);
        event.sig = getSignature(event, priv);
        console.log("publishing:", JSON.stringify(event, null, 2));
        for (let r of relays) {
          await sendBySingleRelay(r, event);
        }
}

export async function republish(id, relays) {
    let eventId = decodeToRaw(id);
        let pool = new SimplePool();
        let events = await pool.list(relays, [{ ids: [eventId] }]);
        let onlyEvent;
        if (events.length > 0) {
          onlyEvent = events[0];
        }
        for (let r of relays) {
          await sendBySingleRelay(r, onlyEvent);
        }
}

