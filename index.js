#!/usr/bin/env node
import "websocket-polyfill";
import inquirer from "inquirer";
import { decodeToRaw } from "./src/utils/utils.js";

import { unwrap_gift } from "./src/functions/giftWrap.js";
import { dm_like } from "./src/functions/dm.js";
import { getPublicKey, nip19 } from "nostr-tools";
import dotenv from "dotenv";
import crypto from "node:crypto";
import { sample, search_by_ids } from "./src/functions/fetch.js";
import { publish, republish } from "./src/functions/publish.js";
globalThis.crypto = crypto;
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
        "decode",
        "encode",
        "search_by_ids",
        "sample",
        "dm_like",
        "publish",
        "unwrap_gift",
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
      case "encode":
        const { id } = await inquirer.prompt([
          {
            type: "input",
            name: "id",
            message: "Enter the raw id",
          },
        ]);
        console.log(nip19.neventEncode({ id: id }));
        break;
      case "key":
        console.log(nip19.npubEncode(pub), pub);
        break;
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

        await dm_like(kinds, limit, counterparty, relays);
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
      case "republish": {
        const { id } = await inquirer.prompt([
          {
            type: "input",
            name: "id",
            message: "Enter event id you want republish:",
            default: "",
          },
        ]);
        await republish(id, relays);
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
