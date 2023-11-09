import "websocket-polyfill";
import { json2ReplaceableEvents, publishAllOrFail } from "./src/functions/publish.js";
import {createHash} from "sha256-uint8array";
import dotenv from "dotenv";
import { Keys } from "./src/classes/Keys.js";
import { deriveKey } from "./src/classes/Keys.js";
dotenv.config();

let priv = process.env.PRIVATE_KEY;
let relays = process.env.DEFAULT_RELAYS.split(",");

async function main() {

    // object for testing
    const data2Store = {
        "BASE_URL": "https://devapi.freefrom.space",
        "NOSTR_SEARCH": "https://search.freefrom.space/api/v1/search",
        "NOSTR_PROFILE_SEARCH": "https://search.freefrom.space/api/v1/search/profile",
        "CHAT_CALL_URL": "wss://chat-dev.freefrom.space/ws",
        "FIREBASE_HOST": "https://fb.freefrom.space",
        "BASE_CMSURL": "https://cms.freefrom.space"
      }


      const org_secret = "53a7694c295f4d84efc8af43744603fbd26bf1d8a108a850904de1f8a4d97146"
    const secret = deriveKey(org_secret,"670d8e8a1e73af72a4e7dc5c5c449beaa0f058dfc608bb730e538ca968aa4782","v1")
    console.log(secret)

      const keys = new Keys("df8ac75da9c96fb86ef6e799307893687c5be79ae3b3bf765059ebd3a33474b0")

      const events = json2ReplaceableEvents(data2Store, keys, secret, "670d8e8a1e73af72a4e7dc5c5c449beaa0f058dfc608bb730e538ca968aa4782", 1);
      //set publish in sequence
      await publishAllOrFail(events, relays, keys)


}

main();