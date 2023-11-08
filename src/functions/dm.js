import { SimplePool } from "nostr-tools";
import { logEvents } from "../utils.js";
import { decryptIfNecessary } from "../utils.js";

export async function dm_like (kinds, limit, counterparty, relays) {
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
        events = await Promise.all(
          events.map((e) => decryptIfNecessary(priv, e))
        );
        logEvents(events);
        pool.close(relays);
}