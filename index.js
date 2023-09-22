#!/usr/bin/env node
import "websocket-polyfill";
import inquirer from "inquirer";
import { decodeToRaw } from "./src/bech32.js";
import {
  SimplePool,
  getPublicKey,
  getEventHash,
  getSignature,
} from "nostr-tools";
import dotenv from "dotenv";
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
      choices: ["decode", "seach_by_ids", "sample", "publish"],
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
  } else if (command === "seach_by_ids") {
    const { ids } = await inquirer.prompt([
      {
        type: "input",
        name: "ids",
        message: "Enter event ids (any format will do):",
        default: "",
      },
    ]);

    let filter = {
      ids: ids.split(",").map((id) => {
        if (id.startsWith("nostr:")) {
          id = id.slice(6);
        }
        if (id.startsWith("n")) {
          let t = decodeToRaw(id);
          if (t.id) {
            id = t.id;
          } else {
            id = t;
          }
        }
        return id;
      }),
    };
    let pool = new SimplePool();
    let events = await pool.list(relays, [filter]);
    console.log(JSON.stringify(events, null, 2));
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
      kinds: kinds.split(",").map(Number),
      limit: Number(limit),
    };
    if (authors !== "") {
      filter.authors = authors.split(",");
    }

    let pool = new SimplePool();
    let events = await pool.list(relays, [filter]);
    console.log(JSON.stringify(events, null, 2));
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

    try {
      event.id = getEventHash(event);
      event.sig = getSignature(event, priv);
      let pool = new SimplePool();

      // If pool.publish returns a promise, await it
      const publishes = pool.publish(relays, event);
      await Promise.all(publishes);
      pool.close(relays);
      process.exit(0);
    } catch (error) {
      console.error("Error:", error);
    }
  }
}
main();
