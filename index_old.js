#!/usr/bin/env node
import "websocket-polyfill";
import inquirer from "inquirer";
import { decodeToRaw, decryptIfNecessary, unwrapGift, logEvents} from "./src/utils/utils.js";
import {
  SimplePool,
  getPublicKey,
  getEventHash,
  getSignature,
  relayInit,
  nip19,
} from "nostr-tools";
import dotenv from "dotenv";
import crypto from "node:crypto";
globalThis.crypto = crypto;
dotenv.config();

let relays = process.env.DEFAULT_RELAYS.split(",");
let priv = process.env.PRIVATE_KEY;
let pub = getPublicKey(priv);

async function getTags(tags = []) {
  const { tag, addAnother } = await inquirer.prompt([
    {
      type: "input",
      name: "tag",
      message: "Enter a tag:",
    },
    {
      type: "confirm",
      name: "addAnother",
      message: "Would you like to add another tag?",
      default: false,
    },
  ]);

  tags.push(tag.split(","));

  if (addAnother) {
    return getTags(tags);
  } else {
    return tags;
  }
}

async function main() {
  const { command } = await inquirer.prompt([
    {
      type: "list",
      name: "command",
      message: "Choose a command:",
      choices: ["key", "decode", "encode", "search_by_ids", "sample", "DMLike", "publish", "unwrap_gift"],
    },
  ]);

  if (command === "decode") {
    const { bech32 } = await inquirer.prompt([
      {
        type: "input",
        name: "bech32",
        message: "Enter the bech32 encode (like npub, nsec, note...):",
      },
    ]);
    console.log(decodeToRaw(bech32));
  } else if (command === "encode") {
    const { id } = await inquirer.prompt([
      {
        type: "input",
        name: "id",
        message: "Enter the raw id",
      },
    ]);
    console.log(nip19.neventEncode({"id": id}))
  } else if (command === "key") {
    console.log(nip19.npubEncode(pub), pub);
  } else if (command === "search_by_ids") {
    const { ids } = await inquirer.prompt([
      {
        type: "input",
        name: "ids",
        message: "Enter event ids (any format will do):",
        default: "",
      },
    ]);

    let filter = {
      ids: ids.split(",").map((id) => decodeToRaw(id)),
    };
    let pool = new SimplePool();
    let events = await pool.list(relays, [filter]);
    events = await Promise.all(events.map((e) => decryptIfNecessary(priv, e)));

    logEvents(events);
    pool.close(relays);
    process.exit(0);
  } else if (command === "sample") {
    const { kinds, limit, authors } = await inquirer.prompt([
      {
        type: "input",
        name: "kinds",
        message: "Enter event kinds (comma-separated):",
      },
      {
        type: "input",
        name: "limit",
        message: "Enter fetch number:",
        validate: (input) =>
          Number.isInteger(Number(input)) || "Please enter a valid number.",
      },
      {
        type: "input",
        name: "authors",
        message: "Enter event authors (comma-separated, leave blank for none):",
        default: "",
      },
    ]);

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
    let tagsForFilter = transformTags(tags)
    for(let t in tagsForFilter){
      filter[t] = tagsForFilter[t]
    }
    let pool = new SimplePool();
    let events = await pool.list(relays, [filter]);
    events = events.slice(0, limit);
    events.sort((a, b) => a.created_at - b.created_at);
    events = await Promise.all(events.map((e) => decryptIfNecessary(priv, e)));
    logEvents(events);
    pool.close(relays);
    process.exit(0);
  } else if (command === "DMLike") {
    const { kinds, limit, counterparty } = await inquirer.prompt([
      {
        type: "input",
        name: "kinds",
        message: "Enter event kinds (comma-separated):",
      },
      {
        type: "input",
        name: "limit",
        message: "Enter fetch number:",
        validate: (input) =>
          Number.isInteger(Number(input)) || "Please enter a valid number.",
      },
      {
        type: "input",
        name: "counterparty",
        message: "Enter counterparty pubkey:",
        default: "",
      },
    ]);

    const _kinds = kinds.split(",").map(Number);
    let filter_to_me = {
      kinds: _kinds,
      limit: Number(limit),
    };
    let filter_from_me = {
      kinds: _kinds,
      limit: Number(limit),
    };
    if (counterparty == "") {
      counterparty = pub;
    }
    filter_to_me.authors = [decodeToRaw(counterparty)];
    filter_to_me["#p"] = [pub];
    filter_from_me.authors = [pub];
    filter_from_me["#p"] = [decodeToRaw(counterparty)];
    let pool = new SimplePool();
    let events = await pool.list(relays, [filter_to_me, filter_from_me]);
    events.sort((a, b) => a.created_at - b.created_at);
    events = events.slice(0, limit);
    events = await Promise.all(events.map((e) => decryptIfNecessary(priv, e)));
    logEvents(events);
    pool.close(relays);
    process.exit(0);
  } else if (command === "publish") {
    const { kind, content } = await inquirer.prompt([
      {
        type: "input",
        name: "kind",
        message: "Enter event kind:",
        validate: (input) =>
          Number.isInteger(Number(input)) || "Please enter a valid number.",
      },
      {
        type: "input",
        name: "content",
        message: "Enter content you want to publish:",
      },
    ]);
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
  } else if(command === "republish"){
    const {id} = await inquirer.prompt([
      {
        type: "input",
        name: "id",
        message: "Enter event id you want republish:",
        default: "",
      }
    ])
    let eventId = decodeToRaw(id);
    let pool = new SimplePool();
    let events = await pool.list(relays, [{ids: [eventId]}]);
    let onlyEvent;
    if(events.length > 0) {
      onlyEvent = events[0];
    }
    for (let r of relays) {
      await sendBySingleRelay(r, onlyEvent);
    }
  }
  else if (command === "unwrap_gift") {
    const { ids } = await inquirer.prompt([
      {
        type: "input",
        name: "ids",
        message: "Enter event ids (any format will do):",
        default: "",
      },
    ]);

    let filter = {
      ids: ids.split(",").map((id) => decodeToRaw(id)),
    };
    let pool = new SimplePool();
    let events = await pool.list(relays, [filter]);
    events = events.map(e => unwrapGift(priv, e))
    for(let e of events){
      console.log("<<<",JSON.stringify(e, null, 2));
      const inner = JSON.parse(e.content)
      console.log(">>>", unwrapGift(priv, inner));
      console.log("-------------------------------------------------")
    }
    pool.close(relays);
    process.exit(0);
  }
}
main();

function timeout(ms, promise) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Operation timed out"));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

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