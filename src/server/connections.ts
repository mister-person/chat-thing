import * as WebSocket from 'ws';
import * as data from '../chatData';
//import * as rt from 'runtypes';

type User = {name: string, socket: WebSocket};
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

  constructor(socket: WebSocket, server: Server) {
    this.server = server;

    socket.on("close", (code: number, reason: string) => {
      console.log(`close ${code} because "${reason}" for ${this.user === null ? null : this.user.user}`);
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
              this.handleNameRequest(messageJson, socket);
            }
          }
          else {
            if(data.ClientMessageAppend.guard(messageJson)) {
              this.handleAppend(messageJson, this.user.user, this.user.room);
            }
            if(data.ClientMessageReplace.guard(messageJson)) {
              this.handleReplace(messageJson, this.user.user, this.user.room);
            }
            if(data.ClientMessageJoinRoom.guard(messageJson)) {
              this.handleJoinRoom(messageJson, this.user);
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

  handleNameRequest(jsonMessage: data.ClientMessageRequestName, socket: WebSocket) {
    //TODO validate
    if(jsonMessage.name === "") {
      socket.send(JSON.stringify(this.nameResponseError("name can't be empty")));
      return null;
    }
    else if(jsonMessage.name.length > 64) {
      socket.send(JSON.stringify(this.nameResponseError("name too long")));
      return null;
    }
    else if(this.server.rooms
      .flatMap(room => room.people)
      .find(user => user.name === jsonMessage.name) !== undefined
    ) {
      socket.send(JSON.stringify(this.nameResponseError("name already taken")));
      return null;
    }
    else {
      let user: User = {
        name: jsonMessage.name,
        socket: socket,
      }

      let nameResponse: data.ServerMessageNameResponse = {
        type: "name",
        newName: user.name,
        isTaken: false
      };
      user.socket.send(JSON.stringify(nameResponse));

      if(user !== null) {
        let room = this.server.getDefaultRoom();
        this.user = {user: user, room: room};
        this.server.joinRoom(this.user.user, room);
      }
    }
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

    let history = room.history.get(userInRoom);
    if(history !== undefined) {
      let slice = history.slice(0, history.length - message.offset)
      if(history.length - message.offset < 0) {
        slice = "";//TODO maybe test this
      }
      let newText = slice + message.text;
      //TODO magic number
      room.history.set(userInRoom, newText.slice(-600));
    }
    else {
      console.log(`history for ${userInRoom} was undefined, creating.`);
      room.history.set(userInRoom, message.text);
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

  constructor() {
    this.rooms = []
    this.rooms.push({name: "default room", people: [], history: new Map()})
    this.rooms.push({name: "new room test", people: [], history: new Map()})
  }

  newConnection(socket: WebSocket) {

    console.log("user count: " + this.rooms.reduce(
      (count: number, room: Room) => count + room.people.length, 0));

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
      name: user.name
    };
    this.sendToRoom(newUserName, room);

    //TODO chathistory
    room.people.push(user);

    //send everyone's name to this user
    let joinRoom: data.ServerMessageJoinRoom = {
      type: "joinroom",
      room: room.name,
      users: room.people.map(user => {
        return {name: user.name, hist: room.history.get(user) || ""}
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
