import * as WebSocket from 'ws';
import * as data from '../chatData';
//import * as rt from 'runtypes';

type User = {name: string, socket: WebSocket};
type Room = {name: string, people: Array<{self: User, chatHistory: string}>};

export class Connections {
  rooms: Array<Room>;

  constructor() {
    this.rooms = []
    this.rooms.push({name: "default room", people: []})
    this.rooms.push({name: "new room test", people: []})
  }

  newConnection(socket: WebSocket) {
    let connection: {user: User, room: Room} | null = null;

    console.log("user count: " + this.rooms.reduce(
      (count: number, room: Room) => count + room.people.length, 0));

    socket.on("error", (socket: any, err: any) => {
      console.log("error on socket");
      console.log(JSON.stringify(err));
      console.log(JSON.stringify(socket));
    });

    socket.on("close", (code: number, reason: string) => {
      console.log(`close ${code} because "${reason}" for ${connection === null ? null : connection.user}`);
      if(connection !== null) {
        this.leaveRoom(connection.user, connection.room);

        /*remove empty rooms
        if(connection.room.people.length === 0) {
          this.rooms = this.rooms.filter(otherRoom => connection?.room !== otherRoom);
        }
        */
      }
    });

    let roomList: data.ServerMessageListRooms = {
      type: "listroom",
      rooms: this.rooms.map(room => {return {name: room.name}})
    };
    setTimeout(() => socket.send(JSON.stringify(roomList)), 500);

    socket.on("message", (message: WebSocket.Data) => {
      if(typeof(message) === "string") {
        console.log("received packet " + message);
        if(message.startsWith("ping")) {
            socket.send("pong " + message.slice(4));

            return;
        }
        try {
          let messageJson = JSON.parse(message);
          if(connection === null) {
            if(data.ClientMessageRequestName.guard(messageJson)) {
              let user = this.handleNameRequest(messageJson, socket);
              if(user !== null) {
                this.joinRoom(user, this.getDefaultRoom());
                connection = {user: user, room: this.getDefaultRoom()};
              }
            }
          }
          else {
            if(data.ClientMessageAppend.guard(messageJson)) {
              this.handleAppend(messageJson, connection.user, connection.room);
            }
            if(data.ClientMessageReplace.guard(messageJson)) {
              this.handleReplace(messageJson, connection.user, connection.room);
              if(messageJson.text === "@") {
                this.leaveRoom(connection.user, connection.room);
                connection.room = this.rooms[1];
                this.joinRoom(connection.user, connection.room);
                this.rooms.map(room => 
                  console.log(`people in room ${room.name}: ${JSON.stringify(room.people.map(p => p.self.name))}`)
                );
              }
            }
            if(data.ClientMessageJoinRoom.guard(messageJson)) {
              let roomMessage = messageJson;
              let room = this.rooms.find((room) => room.name === roomMessage.name)
              if(room === undefined) {
                room = {name: roomMessage.name, people: []};
                this.rooms.push(room);
              }
              this.leaveRoom(connection.user, connection.room);
              connection.room = room;
              this.joinRoom(connection.user, room);
            }
          }
        } catch(e) {
          console.log("error handling message: " + e);
        }
      }
    });
  }

  getDefaultRoom(): Room {
    if(this.rooms.length === 0) {
      this.rooms.push({name: "default room", people: []})
    }
    return this.rooms[0];
  }

  nameResponseError(error: string): data.ServerMessageNameResponse {
    return {
      type: "name",
      newName: error,
      isTaken: true
    }
  }

  handleNameRequest(jsonMessage: data.ClientMessageRequestName, socket: WebSocket): User | null {
    //TODO validate
    if(jsonMessage.name === "") {
      socket.send(JSON.stringify(this.nameResponseError("name can't be empty")));
      return null;
    }
    else if(this.rooms
      .flatMap(room => room.people)
      .find(user => user.self.name === jsonMessage.name) !== undefined
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

      return user;
    }
  }

  joinRoom(user: User, room: Room) {

    console.log(`${user.name} joined ${room.name}`);

    //send this new user's name to everyone
    let newUserName: data.ServerMessageAddUser = {
      type: "adduser",
      name: user.name
    };
    this.sendToRoom(newUserName, room);

    //putting this here sends name to themselves, TODO change
    room.people.push({self: user, chatHistory: ""});

    let joinRoom: data.ServerMessageJoinRoom = {
      type: "joinroom",
      room: room.name,
      users: room.people.map(user => {
        return {name: user.self.name, hist: user.chatHistory}
      })
    };
    user.socket.send(JSON.stringify(joinRoom));
    //this.sendToAllExcept(newUserName, name);
    /*
    room.people.map((otherUser) => {
      //send everyone's name to this new user
      let toNewUser: data.ServerMessageAddUser = {
        type: "adduser",
        name: otherUser.self.name
      }
      user.socket.send(JSON.stringify(toNewUser));
      let history: data.ServerMessageReplace = {
        type: "replace",
        name: otherUser.self.name,
        text: otherUser.chatHistory,
        offset: 0
      }
      user.socket.send(JSON.stringify(history));
    });
    */
  }

  leaveRoom(user: User, room: Room) {
    room.people = room.people.filter((roomUser) => roomUser.self !== user);
    
    let deluserpacket: data.ServerMessageDelUser = {
      type: "deluser",
      name: user.name
    }
    this.sendToRoom(deluserpacket, room);
  }

  handleReplace(message: data.ClientMessageReplace, userFrom: User, room: Room) {
    let userInRoom = room.people.find((user) => user.self === userFrom);
    if(userInRoom === undefined) {
      console.log(`user ${userFrom.name} not in room ${room.name}`);
      console.log(`room ${room.name} contains ${room.people.map(p => p.self.name)}`)
      return;
    }
    let packet: data.ServerMessageReplace = {
      type: "replace",
      name: userFrom.name,
      text: message.text,
      offset: message.offset
    };
    this.sendToRoom(packet, room);

    let slice = userInRoom.chatHistory.slice(0, userInRoom.chatHistory.length - message.offset)
    if(userInRoom.chatHistory.length - message.offset < 0) {
      slice = "";//TODO maybe test this
    }
    let newText = slice + message.text;
    //TODO magic number
    userInRoom.chatHistory = newText.slice(-600);
  }

  handleAppend(message: data.ClientMessageAppend, userFrom: User, room: Room) {
    console.log("got an append: " + JSON.stringify(message));
    let replace: data.ClientMessageReplace = {...message, type: "replace", offset: 0};
    this.handleReplace(replace, userFrom, room);
  /*
    let packet: data.ServerMessageAppend = {
      type: "append",
      name: userFrom,
      text: message.text
    };
    console.log("sending " + JSON.stringify(packet));
    this.sendToAll(packet);
  */
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
      .map((user) => user.self.socket.send(JSON.stringify(packet)));
  }

  sendToRoom(packet: data.ServerMessage, room: Room) {
    room.people.map((user) => user.self.socket.send(JSON.stringify(packet)));
  }
}
