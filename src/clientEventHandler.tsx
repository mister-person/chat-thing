import * as data from "./chatData";

type callbackID = number;

type stringCallback = (name: string) => void;
type replaceCallback = (name: string, offset: number) => void;
type nameCallback = (name: string, isTaken: boolean) => void;

interface callbackElement<T> {
  id: callbackID,
  name?: string,
  callback: T
}

//TODO impl other methods
//TODO replace needs other parameter
export class ChatEventHandler {
  addUserCallbacks: Array<{id: callbackID, callback: stringCallback}>;
  delUserCallbacks: Array<{id: callbackID, callback: stringCallback}>;
  appendCallbacks: Array<{id: callbackID, from: string, callback: stringCallback}>;
  replaceCallbacks: Array<{id: callbackID, from: string, callback: replaceCallback}>;
  nameCallbacks: Array<{id: callbackID, callback: nameCallback}>;

  lastID: number = 0;

  constructor(socket: WebSocket) {
    
    socket.addEventListener("open", (event) => {
      console.log(event)
      socket.send("ping test string");
    });
    socket.addEventListener("message", (event) => {
      if(typeof(event.data) === "string") {
        console.log(event);
        this.handleMessage(event.data);
      }
    });

    this.addUserCallbacks = [];
    this.delUserCallbacks = [];
    this.appendCallbacks = [];
    this.replaceCallbacks = [];
    this.nameCallbacks = [];
  }

  handleMessage(message: string) {
    //TODO this works but is bad, if json is wrong, type assumptions break
    //and validateServerMessage isn't checked
    //TODO catch parse error
    let messageJson = {};
    try {
      messageJson = JSON.parse(message);
    } catch(e) {}
    if(data.ServerMessageAppend.guard(messageJson)) {
      let cbList = this.appendCallbacks;
      //TODO map
      for(let i = 0; i < cbList.length; i++) {
        if(cbList[i].from === messageJson.name) {
          cbList[i].callback(messageJson.text);
        }
      }
    }
    if(data.ServerMessageReplace.guard(messageJson)) {
      let cbList = this.replaceCallbacks;
      for(let i = 0; i < cbList.length; i++) {
        if(cbList[i].from === messageJson.name) {
          cbList[i].callback(messageJson.text, messageJson.offset);
        }
      }
    }
    if(data.ServerMessageAddUser.guard(messageJson)) {
      let cbList = this.addUserCallbacks;
      for(let i = 0; i < cbList.length; i++) {
        cbList[i].callback(messageJson.name);
      }
    }
    if(data.ServerMessageDelUser.guard(messageJson)) {
      let cbList = this.delUserCallbacks;
      for(let i = 0; i < cbList.length; i++) {
        cbList[i].callback(messageJson.name);
      }
    }
    if(data.ServerMessageNameResponse.guard(messageJson)) {
      let nameMessage = messageJson;
      this.nameCallbacks.map((listElement) => {
        listElement.callback(nameMessage.newName, nameMessage.isTaken);
      });
    }
  }

  newID(): callbackID {
    this.lastID++;
    return this.lastID;
  }

  onName(callback: nameCallback): callbackID {
    let id = this.newID();
    this.nameCallbacks.push({id, callback});
    return id;
  }

  onAddUser(callback: (name: string) => void): callbackID {
    let id = this.newID();
    this.addUserCallbacks.push({id, callback});
    return id;
  }

  onDelUser(callback: (name: string) => void): callbackID {
    let id = this.newID();
    this.delUserCallbacks.push({id, callback});
    return id;
  }

  onAppend(name: string, callback: (name: string) => void): callbackID {
    let id = this.newID();
    this.appendCallbacks.push({id, from: name, callback});
    return id;
  }

  onReplace(name: string, callback: (name: string, offset: number) => void): callbackID {
    let id = this.newID();
    this.replaceCallbacks.push({id, from: name, callback});
    return id;
  }

}
