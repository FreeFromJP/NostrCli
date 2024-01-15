#!/usr/bin/env node
import "websocket-polyfill";
import inquirer from "inquirer";
import { decodeToRaw } from "./src/utils/utils.js";

import { unwrap_gift } from "./src/functions/giftWrap.js";
import { dm_like } from "./src/functions/dm.js";
import { getPublicKey, nip19 } from "nostr-tools";
import dotenv from "dotenv";
import crypto from "node:crypto";
globalThis.crypto = crypto;
import {
  fetch_by_filters,
  fetch_user_following,
  sample,
  search_by_ids,
  query_event_adoption,
  analysis_chats,
} from "./src/functions/fetch.js";
import { publish, boardcast } from "./src/functions/publish.js";
import { Keys } from "./src/classes/Keys.js";
//globalThis.crypto = crypto;
dotenv.config();

let relays = process.env.DEFAULT_RELAYS.split(",");
let priv = process.env.PRIVATE_KEY;
let pub = getPublicKey(priv);

async function main() {
  const { command } = await inquirer.prompt([
    {
      type: "list",
      name: "command",
      message: "Choose a command:",
      choices: [
        "key",
        "random_key",
        "decode",
        "encodeEvent",
        "encodePublicKey",
        "encodeSecretKey",
        "search_by_ids",
        "fetch_by_filters",
        "sample",
        "dm_like",
        "event_adoption",
        "chat_adoption",
        "publish",
        "boardcast",
        "unwrap_gift",
        "get_user_following_publicKeys",
      ],
    },
  ]);

  try {
    switch (command) {
      case "decode":
        const { bech32 } = await inquirer.prompt([
          {
            type: "input",
            name: "bech32",
            message: "Enter the bech32 encode (like npub, nsec, note...):",
          },
        ]);
        console.log(decodeToRaw(bech32));
        break;
      case "encodeEvent":
        const { id } = await inquirer.prompt([
          {
            type: "input",
            name: "id",
            message: "Enter the raw id",
          },
        ]);
        console.log(nip19.neventEncode({ id: id }));
        break;
      case "encodePublicKey":
        const { pubKey } = await inquirer.prompt([
          {
            type: "input",
            name: "pubKey",
            message: "Enter the raw pubkey",
          },
        ]);
        console.log(nip19.npubEncode(pubKey));
        break;
      case "encodeSecretKey":
        const { secKey } = await inquirer.prompt([
          {
            type: "input",
            name: "secKey",
            message: "Enter the raw seckey",
          },
        ]);
        console.log(nip19.nsecEncode(secKey));
        break;
      case "key":
        console.log(nip19.npubEncode(pub), pub);
        break;
      case "random_key": {
        const randomKey = new Keys();
        console.log(
          `priv: ${randomKey.privkeyRaw}, pub: ${randomKey.pubkeyRaw}`
        );
        break;
      }
      case "search_by_ids": {
        const { ids } = await inquirer.prompt([
          {
            type: "input",
            name: "ids",
            message: "Enter event ids (any format will do):",
            default: "",
          },
        ]);
        await search_by_ids(ids, relays, priv);
        break;
      }
      case "fetch_by_filters": {
        const { names } = await inquirer.prompt([
          {
            type: "input",
            name: "names",
            message: "Enter filter names in filters file:",
            default: "",
          },
        ]);
        await fetch_by_filters(names, relays);
      }
      case "sample": {
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
            message:
              "Enter event authors (comma-separated, leave blank for none):",
            default: "",
          },
        ]);

        await sample(kinds, limit, authors, relays, priv);
        break;
      }
      case "dm_like": {
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

        await dm_like(kinds, limit, pub, priv, counterparty, relays);
        break;
      }
      case "event_adoption": {
        const { eventId } = await inquirer.prompt([
          {
            type: "input",
            name: "eventId",
            message: "Enter event id:",
          },
        ]);
        await query_event_adoption(relays, eventId);
        break;
      }
      case "chat_adoption": {
        const { from, to, limit } = await inquirer.prompt([
          {
            type: "input",
            name: "from",
            message: "from:",
          },
          {
            type: "input",
            name: "to",
            message: "to:",
          },
          {
            type: "input",
            name: "limit",
            message: "imit:",
          },
        ]);
        await analysis_chats(relays, from, to, limit);
        break;
      }
      case "publish": {
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
        await publish(kind, content, addTags, relays, priv);
        break;
      }
      case "boardcast": {
        const { id } = await inquirer.prompt([
          {
            type: "input",
            name: "id",
            message: "Enter event id you want boardcast:",
            default: "",
          },
        ]);
        await boardcast(id, relays);
        break;
      }
      case "unwrap_gift": {
        const { ids } = await inquirer.prompt([
          {
            type: "input",
            name: "ids",
            message: "Enter event ids (any format will do):",
            default: "",
          },
        ]);
        await unwrap_gift(ids, relays);
        break;
      }
      case "get_user_following_publicKeys": {
        const { pubKey } = await inquirer.prompt([
          {
            type: "input",
            name: "pubKey",
            message: "plz enter your publicKey:",
            default: "",
          },
        ]);
        const following = await fetch_user_following(relays, pubKey);
        console.log(following);
        break;
      }
      default:
        console.error("Command not recognized.");
    }
  } catch (error) {
    console.error("An unexpected error occurred:", error.message);
  } finally {
    // Graceful shutdown logic, if necessary
    process.exit(0);
  }
}
main();
