import { getTags, timeout } from "../utils/utils.js";
import { relayInit } from "nostr-tools";
import { getEventHash, getSignature } from "nostr-tools";
import { decodeToRaw } from "../utils/utils.js";
import { splitJsonEncrypted } from "../utils/json.js";
import { KnownEventKind } from "../utils/constant.js";
import { BaseEvent } from "../classes/BaseEvent.js";
import { Keys } from "../classes/Keys.js";

const TIMEOUT_DURATION = 3000; // 5 seconds, adjust as needed

async function sendBySingleRelay(r, e) {
  try {
    console.log(`try to publish to relay: ${r}`);
    const relay = relayInit(r);
    await timeout(TIMEOUT_DURATION, relay.connect());
    await timeout(TIMEOUT_DURATION, relay.publish(e));
    console.log(`${e.id} has been published by relay: ${r}`);
    relay.close();
  } catch (error) {
    console.log(`----publish error by relay ${r}:`, error);
  }
}

export async function publish(kind, content, addTags, relays, priv) {
  let tags = [];
  if (addTags) {
    tags = await getTags();
  }
  let event = new BaseEvent();
  event.content = content;
  event.kind = Number.parseInt(kind);
  if (tags.length > 0) {
    event.tags = tags;
  }
  event.signByKey(new Keys(priv));
  console.log("publishing:", JSON.stringify(event, null, 2));
  for (let r of relays) {
    await sendBySingleRelay(r, event);
  }
}

export async function publishAllOrFail(events, relays, priv) {
  console.log("publishing:", JSON.stringify(events, null, 2));
  for (let r of relays) {
    await Promise.all(events.map((e) => sendBySingleRelay(r, e)));
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

export function json2ReplaceableEvents(
  jsonObject,
  sender,
  secret,
  dTag,
  shares = 1
) {
  let events = [];
  if (shares === 1) {
    // when only one share is needed, we can put the whole data into data field
    const event = new BaseEvent();
    event.kind = KnownEventKind.APPLICATION_SPECIFIC_DATA;
    event.content = JSON.stringify({
      data: splitJsonEncrypted(jsonObject, secret, shares)[0],
    });
    event.tags = [["d", dTag]];
    event.signByKey2Self(sender);
    events.push(event);
  } else {
    const allShares = splitJsonEncrypted(jsonObject, secret, shares);
    const share1 = allShares[0];
    const shareRest = allShares.splice(1);
    // prepare the events of shareRest
    const shareRestEvents = shareRest.map((data) => {
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
      ref: shareRestEvents.map((e) => e.id),
    });
    share1Event.tags = [["d", dTag]];
    share1Event.signByKey2Self(sender);
    events = [share1Event, ...shareRestEvents];
  }
  return events;
}

export async function publishJSON2Relay(
  jsonObject,
  sender,
  secret,
  dTag,
  relays,
  shares = 1
) {
  const events = json2ReplaceableEvents(
    jsonObject,
    sender,
    secret,
    dTag,
    shares
  );
  console.log(
    `publishing json data 2 relays with index event id: ${events[0].id}`
  );
  await publishAllOrFail(events, relays, sender);
}
