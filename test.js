import "websocket-polyfill";
import { json2ReplaceableEvents, publishAllOrFail } from "./src/functions/publish.js";
import {createHash} from "sha256-uint8array";
import dotenv from "dotenv";
import { Keys } from "./src/classes/Keys.js";
dotenv.config();

let priv = process.env.PRIVATE_KEY;
let relays = process.env.DEFAULT_RELAYS.split(",");

async function main() {

    //object for testing
    const data2Store = {
        _id: '6548ecfaf4bdafcd149fad98',
        index: 0,
        guid: 'c1763c47-8777-47bd-87bc-7b4a81918962',
        isActive: true,
        balance: '$3,019.70',
        picture: 'http://placehold.it/32x32',
        age: 30,
        eyeColor: 'green',
        name: 'Guerrero Nash',
        gender: 'male',
        company: 'FARMAGE',
        email: 'guerreronash@farmage.com',
        phone: '+1 (935) 583-2501',
        address: '487 Dahlgreen Place, Enlow, Michigan, 908',
        about:
          'Enim sint occaecat nulla consequat id tempor nisi pariatur id dolore reprehenderit. Nulla excepteur nostrud magna fugiat cillum aute nostrud eiusmod sunt officia esse. Officia tempor occaecat dolor mollit cupidatat qui ex fugiat sunt dolore qui ea duis aute. Non ipsum aliqua veniam eu consectetur occaecat sit minim dolore deserunt incididunt aliqua. Ipsum in duis ut aliquip ad tempor laborum velit commodo. Consequat excepteur adipisicing ad Lorem in elit incididunt do nostrud ex laborum occaecat reprehenderit. Elit sunt laboris nisi ut pariatur aute tempor est officia labore consequat ad Lorem anim.\r\n',
        registered: '2018-11-27T11:52:34 -09:00',
        latitude: 40.237423,
        longitude: 60.913071,
        tags: ['Lorem', 'labore', 'eiusmod', 'amet', 'proident', 'minim', 'sint'],
        friends: [
          {
            id: 0,
            name: 'Cole Buckner',
          },
          {
            id: 1,
            name: 'Barr Harris',
          },
          {
            id: 2,
            name: 'Osborne Casey',
          },
        ],
        greeting: 'Hello, Guerrero Nash! You have 6 unread messages.',
        favoriteFruit: 'strawberry',
      };

      const text = "this is a secret";
      const secret = createHash().update(text).digest();
      const keys = new Keys()



      const events = json2ReplaceableEvents(data2Store, keys, secret, "d_test", 2);
      //set publish in sequence
      await publishAllOrFail(events, relays, keys)

      



}

main();