import * as WebSocket from 'ws';
import * as data from '../chatData';
import * as crypto from 'crypto';
//import 'crypto';
//import * as rt from 'runtypes';

class User {
  name: string;
  socket: WebSocket;
  sessionID: string
  constructor(name: string, socket: WebSocket, sessionID: string) {
    this.name = name
    this.socket = socket
    this.sessionID = sessionID
  }

  getHash() {
    return JSON.stringify([this.name, this.sessionID]);
  }
}
//type Room = {
//  name: string,
//  people: Array<{self: User}>,
//  history: Map<string, string>, //map<username, history>
//};

class Room {
  name: string;
  people: Array<User> = [];
  history: Map<string | User, string> = new Map(); //map<username, history>

  constructor(name: string) {
    this.name = name;
  }
}

class Connection {
  user: {user: User, room: Room} | null = null;
  server: Server;
  sessionID: string | null;
  socket: WebSocket;

  constructor(socket: WebSocket, server: Server) {
    this.server = server;
    this.sessionID = null;
    this.socket = socket;

    socket.on("close", (code: number, reason: string) => {
      console.log(`close ${code} because "${reason}" for ${this.user === null ? null : this.user.user.name}`);
      if(this.user !== null) {
        server.leaveRoom(this.user.user, this.user.room);
      }
    });

    socket.on("message", (message: WebSocket.Data) => {
      if(typeof(message) === "string") {
        console.log("received packet " + message);
        if(message.startsWith("ping")) {
          socket.send("pong " + message.slice(4));

          return;
        }
        try {
          let messageJson = JSON.parse(message);
          if(this.user === null) {
            if(data.ClientMessageRequestName.guard(messageJson)) {
              this.handleNameRequest(messageJson);
            }
            if(data.ClientMessageHandshake.guard(messageJson)) {
              this.handleHandshake(messageJson);
            }
          }
          else if(this.sessionID !== null) {
            if(data.ClientMessageAppend.guard(messageJson)) {
              this.handleAppend(messageJson, this.user.user, this.user.room);
            }
            if(data.ClientMessageReplace.guard(messageJson)) {
              this.handleReplace(messageJson, this.user.user, this.user.room);
            }
            if(data.ClientMessageJoinRoom.guard(messageJson)) {
              this.handleJoinRoom(messageJson, this.user);
            }
            if(data.ClientMessageLogout.guard(messageJson)) {
              console.log("logging out", this.user.user.name);
              this.server.leaveRoom(this.user.user, this.user.room);
              this.user = null;
              this.server.sessions.delete(this.sessionID);
            }
          }
        } catch(e) {
          console.log("error handling message: " + e);
        }
      }
    });
  }

  nameResponseError(error: string): data.ServerMessageNameResponse {
    return {
      type: "name",
      newName: error,
      isTaken: true
    }
  }

  handleHandshake(jsonMessage: data.ClientMessageHandshake) {
    let username = undefined;
    if(jsonMessage.session !== undefined) {
      this.sessionID = jsonMessage.session;
      username = this.server.sessions.get(jsonMessage.session);
    }
    if(username !== undefined) {
      let user = this.server.getUserFromName(username);
      let room = this.server.getRoomWithUser(username);
      //kick old user from this connection
      if(user !== undefined && room !== undefined) {
        user?.socket.close();
        this.server.leaveRoom(user, room);
        user.name = "";//make it not kick new user when socket closes
      }
      this.logIn(username);
    }
  }

  handleNameRequest(jsonMessage: data.ClientMessageRequestName) {
    if(jsonMessage.name === "") {
      this.socket.send(JSON.stringify(this.nameResponseError("name can't be empty")));
      return null;
    }
    else if(jsonMessage.name.length > 32) {
      this.socket.send(JSON.stringify(this.nameResponseError("name too long")));
      return null;
    }
    else if(this.server.getRoomWithUser(jsonMessage.name) !== undefined) {
      this.socket.send(JSON.stringify(this.nameResponseError("name already taken")));
      return null;
    }
    /*
    else if(Array.from(this.server.sessions.values()).find(name => name === jsonMessage.name) !== undefined) {
      socket.send(JSON.stringify(this.nameResponseError("name already taken")));
      console.log(JSON.stringify(this.server.sessions));
      return null;
    }
    */
    else {
      this.logIn(jsonMessage.name);
    }
  }

  logIn(name: string) {
    if(this.sessionID === null) {
      this.sessionID = this.newSessionID();
      console.log("new session id", this.sessionID);
    }
    let user: User = new User(name, this.socket, this.sessionID)

    let nameResponse: data.ServerMessageNameResponse = {
      type: "name",
      newName: user.name,
      session: this.sessionID,
      isTaken: false
    };
    user.socket.send(JSON.stringify(nameResponse));

    let room = this.server.getDefaultRoom();
    this.user = {user: user, room: room};
    this.server.joinRoom(this.user.user, room);
    this.server.sessions.set(this.sessionID, user.name);
  }

  newSessionID(): string {
    return crypto.randomBytes(24).toString("base64")
  }

  //TODO move some of this back to Server class
  handleReplace(message: data.ClientMessageReplace, userFrom: User, room: Room) {
    //TODO user in room
    let userInRoom = room.people.find((user) => user === userFrom);
    if(userInRoom === undefined) {
      console.log(`user ${userFrom.name} not in room ${room.name}`);
      console.log(`room ${room.name} contains ${room.people.map(p => p.name)}`)
      return;
    }
    let packet: data.ServerMessageReplace = {
      type: "replace",
      name: userFrom.name,
      text: message.text,
      offset: message.offset
    };
    this.server.sendToRoom(packet, room);

    let history = room.history.get(userInRoom.getHash());
    if(history !== undefined) {
      let slice = history.slice(0, history.length - message.offset)
      if(history.length - message.offset < 0) {
        slice = "";//TODO maybe test this
      }
      let newText = slice + message.text;
      //TODO magic number
      room.history.set(userInRoom.getHash(), newText.slice(-600));
    }
    else {
      console.log(`history for ${userInRoom.name} was undefined, creating.`);
      room.history.set(userInRoom.getHash(), message.text);
    }
  }

  handleAppend(message: data.ClientMessageAppend, userFrom: User, room: Room) {
    console.log("got an append: " + JSON.stringify(message));
    let replace: data.ClientMessageReplace = {...message, type: "replace", offset: 0};
    this.handleReplace(replace, userFrom, room);
  }

  handleJoinRoom(message: data.ClientMessageJoinRoom, connection: {user: User, room: Room}) {
    let roomMessage = message;
    let room = this.server.changeRoom(connection.user, connection.room, roomMessage.name);
    connection.room = room;
  }

}

//TODO what happens if people are in a room that's not in the rooms[] list
export class Server {
  rooms: Array<Room>;
  sessions: Map<string, string>;

  constructor() {
    this.rooms = []
    this.rooms.push({name: "default room", people: [], history: new Map()})
    this.rooms.push({name: "new room test", people: [], history: new Map()})
    this.sessions = new Map();
  }

  newConnection(socket: WebSocket) {
    console.log("users:", this.rooms.flatMap(room => room.people.map(user => user.name)));

    socket.on("error", (socket: any, err: any) => {
      console.log("error on socket");
      console.log(JSON.stringify(err));
      console.log(JSON.stringify(socket));
    });

    new Connection(socket, this);
  }

  getDefaultRoom(): Room {
    if(this.rooms.length === 0) {
      this.rooms.push(new Room("default room"))
    }
    return this.rooms[0];
  }

  changeRoom(user: User, oldRoom: Room, newRoomName: string): Room {
    let newRoom = this.rooms.find((room) => room.name === newRoomName)
    if(newRoom === undefined) {
      newRoom = new Room(newRoomName);
      this.rooms.push(newRoom);
      this.sendRoomListToAll();
    }
    this.leaveRoom(user, oldRoom);
    this.joinRoom(user, newRoom);
    return newRoom;
  }

  joinRoom(user: User, room: Room) {

    console.log(`${user.name} joined ${room.name}`);

    //send this new user's name to everyone
    let newUserName: data.ServerMessageAddUser = {
      type: "adduser",
      name: user.name,
    };
    let newUserText: data.ServerMessageReplace = {
      type: "replace",
      name: user.name,
      text: room.history.get(user.getHash()) || "",
      offset: 0
    }
    this.sendToRoom(newUserName, room);
    this.sendToRoom(newUserText, room);

    room.people.push(user);

    //send everyone's name to this user
    let joinRoom: data.ServerMessageJoinRoom = {
      type: "joinroom",
      room: room.name,
      users: room.people.map(user => {
        return {name: user.name, hist: room.history.get(user.getHash()) || ""}
      })
    };
    user.socket.send(JSON.stringify(joinRoom));

    this.sendRoomListToAll();
  }

  //TODO remove empty rooms
  leaveRoom(user: User, room: Room) {
    room.people = room.people.filter((roomUser) => roomUser !== user);
    
    let deluserpacket: data.ServerMessageDelUser = {
      type: "deluser",
      name: user.name
    }
    this.sendToRoom(deluserpacket, room);

    this.sendRoomListToAll();
  }

  getRoomWithUser(username: string): Room | undefined {
    return this.rooms.find(room => room.people.find(user => user.name === username));
  }

  getUserFromName(username: string): User | undefined {
    return this.rooms.flatMap(room => room.people).find(user => user.name === username);
  }

  sendRoomListToAll() {
    let roomListPacket: data.ServerMessageListRooms = {
      type: "listroom",
      rooms: this.rooms.map(room => {return {name: room.name, usrcount: room.people.length}})
    }
    this.sendToAll(roomListPacket);
  }

/*
  joinRoom(user: Person, room: Room) {
    room.people.map(roomPerson => {
      roomPerson.person.socket.send
    });
    room.people.push(person);
  }
*/

/*
  sendToAllExcept(packet: data.ServerMessageAppend, user: Person) {
    this.connections.map((con) => {
      if(con.name !== user.name) {
        con.socket.send(JSON.stringify(packet))
      }
    });
  }
*/

  sendToAll(packet: data.ServerMessage) {
    this.rooms.flatMap(room => room.people)
      .map((user) => user.socket.send(JSON.stringify(packet)));
  }

  sendToRoom(packet: data.ServerMessage, room: Room) {
    room.people.map((user) => user.socket.send(JSON.stringify(packet)));
  }
}
