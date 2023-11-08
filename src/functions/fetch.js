import { SimplePool } from "nostr-tools";
import { logEvents } from "../utils.js";
import { decryptIfNecessary } from "../utils.js";
import inquirer from "inquirer";

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