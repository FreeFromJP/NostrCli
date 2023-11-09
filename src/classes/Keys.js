import { getPublicKey, generatePrivateKey } from "nostr-tools";

export class Keys {
    constructor(priv) {
        if(priv) {
            this.privkeyRaw = priv;
            this.pubkeyRaw = getPublicKey(priv);
        }else {
            this.privkeyRaw = generatePrivateKey();
            this.pubkeyRaw = getPublicKey(this.privkeyRaw);
        }
        
    }
}