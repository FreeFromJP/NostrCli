import { nip19, nip04, getPublicKey } from "nostr-tools";
import inquirer from "inquirer";

export function decodeToRaw(s) {
  if (s.startsWith("nostr:")) {
    s = s.slice(6);
  }
  if (s.startsWith("n")) {
    let t = nip19.decode(s).data;
    if (t.id) {
      s = t.id;
    } else {
      s = t;
    }
  }
  return s;
}

const KINDS_TO_BE_DECRYPTED = [4, 1404];

export async function decryptIfNecessary(prikey, event) {
  if (KINDS_TO_BE_DECRYPTED.includes(event.kind)) {
    let myPubKey = getPublicKey(prikey);
    const eventPubKey = event.pubkey;
    const pTagKey = event.tags.filter((t) => t[0] == "p")[0][1];
    if (eventPubKey == myPubKey) {
      event.content = await nip04.decrypt(
        prikey,
        pTagKey,
        event.content
      );
    } else if (pTagKey == myPubKey) {
      event.content = await nip04.decrypt(prikey, eventPubKey, event.content);
    }
  }
  return event;
}

export function logEvents(events) {
  events.forEach(element => {
    element.created_at = formatDate(element.created_at)
  });
  console.log(JSON.stringify(events, null, 2));
  console.log("total events number:", events.length)
}

export function formatDate(timestamp) {
  const date = new Date(timestamp * 1000); // Convert to milliseconds
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed in JavaScript
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export async function getTags(tags = []) {
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

export function timeout(ms, promise) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Operation timed out"));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
