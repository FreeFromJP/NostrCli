import { SimplePool } from "nostr-tools";
import { logEvents } from "../utils/utils.js";
import { decryptIfNecessary } from "../utils/utils.js";
import inquirer from "inquirer";
import { decodeToRaw } from "../utils/utils.js";
import { getTags } from "../utils/utils.js";
import { reassembleJsonDecrypted } from "../utils/json.js";
import { filters } from "../data/filter.js";
import { nip19 } from "nostr-tools";

function transformTags(tags) {
  const output = {};

  for (let i = 0; i < tags.length; i++) {
    const key = "#" + tags[i][0];
    const value = tags[i][1];

    if (!output[key]) {
      output[key] = [];
    }

    output[key].push(value);
  }

  return output;
}


export async function sample(kinds, limit, authors, relays, priv) {
  let filter = {
    limit: Number(limit),
  };
  if (kinds !== "") {
    filter.kinds = kinds.split(",").map(Number);
  }
  if (authors !== "") {
    filter.authors = authors.split(",").map((a) => decodeToRaw(a));
  }
  const { addTags } = await inquirer.prompt([
    {
      type: "confirm",
      name: "addTags",
      message: "Would you like to add tags?",
      default: false,
    },
  ]);
  let tags = [];
  if (addTags) {
    tags = await getTags();
  }
  let tagsForFilter = transformTags(tags);
  for (let t in tagsForFilter) {
    filter[t] = tagsForFilter[t];
  }
  let pool = new SimplePool();
  let events = await pool.list(relays, [filter]);
  events = events.slice(0, limit);
  events.sort((a, b) => a.created_at - b.created_at);
  events = await Promise.all(
    events.map((e) => decryptIfNecessary(priv, e))
  );
  logEvents(events);
  pool.close(relays);
}

export async function search_by_ids(ids, relays, priv) {
  let filter = {
    ids: ids.split(",").map((id) => decodeToRaw(id)),
  };
  let pool = new SimplePool();
  let events = await pool.list(relays, [filter]);
  events = await Promise.all(
    events.map((e) => decryptIfNecessary(priv, e))
  );

  logEvents(events);
  pool.close(relays);
}

export async function fetchJsonFromRelay(indexEventId, relays, secret) {

}

export function events2Json(events, secret) {
  //assume the events are aligned properly
  const data = events.map(e => JSON.parse(e.content).data);
  return reassembleJsonDecrypted(data, secret);
}

export async function fetch_by_filters(filterNames, relays) {
  let fs = filterNames.split(",").map(name => filters[name]);
  let pool = new SimplePool();
  let events = await pool.list(relays, fs);
  logEvents(events);
  console.log("total events:", events.length);
  pool.close(relays);
}

export async function fetch_user_following(relays, publicKey) {
  let filter = {
    kinds: [3],
    authors: [decodeToRaw(publicKey)],
  };
  let pool = new SimplePool();
  let events = await pool.list(relays, [filter]);
  // Sort events by created_at in descending order
  events.sort((a, b) => b.created_at - a.created_at);
  // Only keep the latest event
  let latestEvent = events[0];
  let followingsArray = [];
  try {
    for (let [key, value] of latestEvent.tags) {
      if (key === 'p') {
        let npub = nip19.npubEncode(value);
        followingsArray.push(npub);
      }
    }
  } catch (error) {
    console.error('Failed to parse event:', latestEvent, 'Error:', error);
  } finally {
    pool.close(relays);
  }
  return followingsArray;
}