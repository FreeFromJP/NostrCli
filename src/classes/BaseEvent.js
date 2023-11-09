import { getSignature, getEventHash } from "nostr-tools";

export class BaseEvent {
  constructor() {
    this.id = "";
    this.pubkey = "";
    this.created_at = Math.round(Date.now() / 1000);
    this.kind = -1;
    this.tags = [];
    this.content = "";
    this.sig = "";
  }

  hash() {
    this.id = getEventHash(this);
  }

  signByKey(keys) {
    this.pubkey = keys.pubkeyRaw;
    this.hash();
    this.sig = getSignature(this, keys.privkeyRaw);
  }

  signByKey2Self(keys) {
    this.tags.push(["p", keys.pubkeyRaw]);
    this.signByKey(keys);
  }
}
