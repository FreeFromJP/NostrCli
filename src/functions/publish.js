import { getTags, timeout } from "../utils/utils.js";
import { relayInit } from "nostr-tools";
import { getEventHash, getSignature } from "nostr-tools";
import { decodeToRaw } from "../utils/utils.js";

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


export function json2ReplaceableEvents(jsonObject, sender, secret, dTag, shares = 1) {
    let events = [];
    if (shares === 1) {
      // when only one share is needed, we can put the whole data into data field
      const event = new BaseEvent();
      event.kind = KnownEventKind.APPLICATION_SPECIFIC_DATA;
      event.content = JSON.stringify({
        data: splitJsonEncrypted(jsonObject, secret, shares),
      });
      event.tags = [['d', dTag]];
      event.signByKey2Self(sender);
      events.push(event);
    } else {
      const allShares = splitJsonEncrypted(jsonObject, secret, shares);
      const share1 = allShares[0];
      const shareRest = allShares.splice(1);
      // prepare the events of shareRest
      const shareRestEvents = shareRest.map(data => {
        const event = new BaseEvent();
        event.kind = KnownEventKind.STORAGE;
        event.content = JSON.stringify({
          data: data,
        });
        event.signByKey(new Keys());
        return event;
      });
      const share1Event = new BaseEvent();
      share1Event.kind = KnownEventKind.APPLICATION_SPECIFIC_DATA;
      share1Event.content = JSON.stringify({
        data: share1,
        ref: shareRestEvents.map(e => e.id),
      });
      share1Event.tags = [['d', dTag]];
      share1Event.signByKey2Self(sender);
      events = [share1Event, ...shareRestEvents];
    }
    return events;
  }
  
  // Assuming BaseEvent, KnownEventKind, splitJsonEncrypted, and Keys are defined elsewhere
  
  // todo move code from project to this console