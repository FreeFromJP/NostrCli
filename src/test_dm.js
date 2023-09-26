import crypto from 'node:crypto'
import {nip04, getPublicKey, generatePrivateKey} from 'nostr-tools'
globalThis.crypto = crypto
// // sender
// let sk1 = generatePrivateKey()
// let pk1 = getPublicKey(sk1)

// // receiver
// let sk2 = generatePrivateKey()
// let pk2 = getPublicKey(sk2)

// on the sender side
// let message = 'test for DM!'
// let ciphertext = await nip04.encrypt(sk1, pk2, message)

// let event = {
//   kind: 4,
//   pubkey: pk1,
//   tags: [['p', pk2]],
//   content: ciphertext,
// }

//ignore the event transmission

// on the receiver side

// let plaintext = await nip04.decrypt(sk2, pk1, event.content)
// console.log(plaintext)

let sk2 = "e3aba7a53c5f4105f96415dbf868d7c656824fed21c5351b6023e4cdf08e1630"
let pk1 = "3075c12a9b1cb7e5e660c4a6555a97c961d7ae83997f0f401d3203b091bb712f"
let content = "gQeyfVRlxK39AHH60BiL3w==?iv=FUbp7Kf/WgWjYQoJAeUavQ=="
console.log(await nip04.decrypt(sk2, pk1, content))