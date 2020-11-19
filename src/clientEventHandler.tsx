import * as data from "./chatData";

type callbackID = number;

//TODO impl other methods
//TODO replace needs other parameter
export class ChatEventHandler {
  addUserCallbacks: Array<{id: callbackID, callback: (name: string) => void}>;
  delUserCallbacks: Array<{id: callbackID, callback: (name: string) => void}>;
  appendCallbacks: Array<{id: callbackID, name: string, callback: (name: string) => void}>;
  replaceCallbacks: Array<{id: callbackID, name: string, callback: (name: string, offset: number) => void}>;

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
  }

  handleMessage(message: string) {
    //TODO this works but is bad, if json is wrong, type assumptions break
    //and validateServerMessage isn't checked
    //TODO catch parse error
    let messageJson = {};
    try {
      messageJson = JSON.parse(message);
    } catch(e) {}
    if(data.validateServerMessage(messageJson)) {
      if(messageJson.type === "append") {
        let cbList = this.appendCallbacks;
        for(let i = 0; i < cbList.length; i++) {
          if(cbList[i].name === messageJson.name) {
            cbList[i].callback(messageJson.text);
          }
        }
      }
      if(messageJson.type === "replace") {
        let cbList = this.replaceCallbacks;
        for(let i = 0; i < cbList.length; i++) {
          if(cbList[i].name === messageJson.name) {
            cbList[i].callback(messageJson.text, messageJson.offset);
          }
        }
      }
      if(messageJson.type === "adduser") {
        let cbList = this.addUserCallbacks;
        for(let i = 0; i < cbList.length; i++) {
          cbList[i].callback(messageJson.name);
        }
      }
      if(messageJson.type === "deluser") {
        let cbList = this.delUserCallbacks;
        for(let i = 0; i < cbList.length; i++) {
          cbList[i].callback(messageJson.name);
        }
      }
    }
  }

  onAddUser(callback: (name: string) => void): callbackID {
    this.lastID++;
    let id: callbackID = 0;
    this.addUserCallbacks.push({id, callback});
    return id;
  }

  onDelUser(callback: (name: string) => void): callbackID {
    this.lastID++;
    let id: callbackID = 0;
    this.delUserCallbacks.push({id, callback});
    return id;
  }

  onAppend(name: string, callback: (name: string) => void): callbackID {
    this.lastID++;
    let id: callbackID = 0;
    this.appendCallbacks.push({id, name, callback});
    return id;
  }

  onReplace(name: string, callback: (name: string, offset: number) => void): callbackID {
    this.lastID++;
    let id: callbackID = 0;
    this.replaceCallbacks.push({id, name, callback});
    return id;
  }

}
