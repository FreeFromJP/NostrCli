import {nip19} from 'nostr-tools'

export function decodeToRaw(s) {
    return nip19.decode(s).data
}
