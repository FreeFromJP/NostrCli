import { SimplePool } from "nostr-tools";
import { logEvents } from "../utils/utils.js";
import { decryptIfNecessary } from "../utils/utils.js";
import inquirer from "inquirer";
import { decodeToRaw } from "../utils/utils.js";
import { getTags } from "../utils/utils.js";
import { reassembleJsonDecrypted } from "../utils/json.js";
import { filters } from "../data/filter.js";
import { nip19 } from "nostr-tools";
import { formatDate, simplifyRelayURI } from "../utils/utils.js";

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
  events = await Promise.all(events.map((e) => decryptIfNecessary(priv, e)));
  logEvents(events);
  pool.close(relays);
}

export async function search_by_ids(ids, relays, priv) {
  let filter = {
    ids: ids.split(",").map((id) => decodeToRaw(id)),
  };
  let pool = new SimplePool();
  let events = await pool.list(relays, [filter]);
  events = await Promise.all(events.map((e) => decryptIfNecessary(priv, e)));

  logEvents(events);
  pool.close(relays);
}

export async function fetchJsonFromRelay(indexEventId, relays, secret) {}

export function events2Json(events, secret) {
  //assume the events are aligned properly
  const data = events.map((e) => JSON.parse(e.content).data);
  return reassembleJsonDecrypted(data, secret);
}

export async function fetch_by_filters(filterNames, relays) {
  let fs = filterNames.split(",").map((name) => filters[name]);
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
      if (key === "p") {
        let npub = nip19.npubEncode(value);
        followingsArray.push(npub);
      }
    }
  } catch (error) {
    console.error("Failed to parse event:", latestEvent, "Error:", error);
  } finally {
    pool.close(relays);
  }
  return followingsArray;
}

export async function query_event_adoption(relays, eventId) {
  let filter = {
    ids: [eventId],
  };
  let pool = new SimplePool({ seenOnEnabled: true });
  await pool.list(relays, [filter]);
  console.log(pool.seenOn(eventId));
}

export async function analysis_chats(relays, from, to, limit) {
  let filter_from = {
    kinds: [4, 1404],
    authors: [from],
    "#p": [to],
    limit: Number(limit),
  };
  let filter_to = {
    kinds: [4, 1404],
    authors: [to],
    "#p": [from],
    limit: Number(limit),
  };
  let pool = new SimplePool({ eoseSubTimeout: 5000, seenOnEnabled: true });
  let results = await pool.list(relays, [filter_from, filter_to]);
  
  results = results.sort((a, b) => b.created_at - a.created_at).slice(0, limit);
  let previousRelayList = []; // Initialize as an empty array
  let isFirstLine = true; // Flag for the first line

  results.forEach((element) => {
    element.created_at = formatDate(element.created_at);
    let currentRelayList = pool
      .seenOn(element.id)
      .sort()
      .map((a) => simplifyRelayURI(a));

    let direction = element.pubkey == from ? ">>>" : "<<<";

    if (isFirstLine) {
      // For the first line, just print the relays
      console.log(`${element.created_at} ${direction} ${currentRelayList.join("|")}`);
      isFirstLine = false;
    } else {
      let commonRelays = previousRelayList
        .filter((r) => currentRelayList.includes(r))
        .join("|");
      let newRelays = currentRelayList
        .filter((r) => !previousRelayList.includes(r))
        .join("|");
      let removedRelays = previousRelayList
        .filter((r) => !currentRelayList.includes(r))
        .join("|");

      if (newRelays.length === 0 && removedRelays.length === 0) {
        // If there are no changes, only print the timestamp and an upward arrow
        console.log(`${element.created_at} ${direction} ↑`);
      } else {
        // Print common relays, and then new and removed relays
        let logLine = `${element.created_at} ${direction} = [${commonRelays}]`;
        if (newRelays.length > 0) {
          logLine += `, + [${newRelays}]`;
        }
        if (removedRelays.length > 0) {
          logLine += `, - [${removedRelays}]`;
        }
        console.log(logLine);
      }
    }

    // Update the previous relay list for the next iteration
    previousRelayList = currentRelayList;
  });
}
