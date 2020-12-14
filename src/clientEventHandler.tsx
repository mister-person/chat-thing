import * as data from "./chatData";

type callbackID = number;

type stringCallback = (name: string) => void;
type replaceCallback = (name: string, offset: number) => void;
type nameCallback = (name: string, isTaken: boolean) => void;
type newRoomCallback = (room: string, users: Array<{name: string, hist: string}>) => void;
type roomListCallback = (rooms: Array<{name: string, usrcount: number}>) => void;

export class ChatEventHandler {
  addUserCallbacks: Array<{id: callbackID, callback: stringCallback}>;
  delUserCallbacks: Array<{id: callbackID, callback: stringCallback}>;
  appendCallbacks: Array<{id: callbackID, from: string, callback: stringCallback}>;
  replaceCallbacks: Array<{id: callbackID, from: string, callback: replaceCallback}>;
  nameCallbacks: Array<{id: callbackID, callback: nameCallback}>;
  roomCallbacks: Array<{id: callbackID, callback: newRoomCallback}>;
  roomListCallbacks: Array<{id: callbackID, callback: roomListCallback}>;

  lastID: number = 0;

  constructor(socket: WebSocket) {
    this.newSocket(socket);

    this.addUserCallbacks = [];
    this.delUserCallbacks = [];
    this.appendCallbacks = [];
    this.replaceCallbacks = [];
    this.nameCallbacks = [];
    this.roomCallbacks = [];
    this.roomListCallbacks = [];
  }

  newSocket(socket: WebSocket) {
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
  }

  handleMessage(message: string) {
    let messageJson = {};
    try {
      messageJson = JSON.parse(message);
    } catch(e) {}
    console.log(message);
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
      this.nameCallbacks.map((cb) => {
        cb.callback(nameMessage.newName, nameMessage.isTaken);
      });
    }
    if(data.ServerMessageJoinRoom.guard(messageJson)) {
      let roomMessage = messageJson;
      this.roomCallbacks.map((cb) => {
        cb.callback(roomMessage.room, roomMessage.users);
      });
    }
    if(data.ServerMessageListRooms.guard(messageJson)) {
      let roomMessage = messageJson;
      this.roomListCallbacks.map((cb) => {
        cb.callback(roomMessage.rooms);
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

  onNewRoom(callback: newRoomCallback): callbackID {
    let id = this.newID();
    this.roomCallbacks.push({id, callback});
    return id;
  }

  onRoomList(callback: roomListCallback): callbackID {
    console.log("DSJFIO");
    let id = this.newID();
    this.roomListCallbacks.push({id, callback});
    return id;
  }

}
