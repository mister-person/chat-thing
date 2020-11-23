import * as WebSocket from 'ws';
import * as data from '../chatData';
//import * as rt from 'runtypes';

//TODO some chat history

type Person = {name: string, socket: WebSocket};

export class Connections {
  connections: Array<Person>;
  pid: number;

  constructor() {
    this.connections = [];
    this.pid = 0
  }
  
  newConnection(socket: WebSocket) {
    let personName: string | null = null;
    this.pid++;

    socket.on("close", (code: number, reason: string) => {
      console.log(`close ${code} because "${reason}" for ${personName}`);
      if(personName !== null) {
        this.connections = this.connections.filter((connection) => connection.socket !== socket);
        let deluserpacket: data.ServerMessageDelUser = {
          type: "deluser",
          name: personName
        }
        this.sendToAll(deluserpacket);
      }
    });

    socket.on("message", (message: WebSocket.Data) => {
      if(typeof(message) === "string") {
        console.log(message);
        if(message.startsWith("ping")) {
            socket.send("pong " + message.slice(4));
            return;
        }
        try {
          let messageJson = JSON.parse(message);
          if(personName === null) {
            if(data.ClientMessageRequestName.guard(messageJson)) {
              personName = this.handleNameRequest(messageJson, socket);
            }
          }
          else {
            if(data.ClientMessageAppend.guard(messageJson)) {
              this.handleAppend(messageJson, personName);
            }
            if(data.ClientMessageReplace.guard(messageJson)) {
              this.handleReplace(messageJson, personName);
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

  handleNameRequest(jsonMessage: data.ClientMessageRequestName, socket: WebSocket): string | null {
    //TODO validate
    if(jsonMessage.name === "") {
      socket.send(JSON.stringify(this.nameResponseError("name can't be empty")));
      return null;
    }
    else if(this.connections.find(person => person.name === jsonMessage.name) !== undefined) {
      socket.send(JSON.stringify(this.nameResponseError("name already taken")));
      return null;
    }
    else {
      this.logIn(jsonMessage.name, socket);
      return jsonMessage.name;
    }
  }

  logIn(personName: string, socket: WebSocket) {
    let nameResponse: data.ServerMessageNameResponse = {
      type: "name",
      newName: personName,
      isTaken: false
    };
    socket.send(JSON.stringify(nameResponse));

    this.connections.push({name: personName, socket});

    console.log(`new person ${personName}`);

    //send this new user's name to everyone
    let newUserName: data.ServerMessageAddUser = {
      type: "adduser",
      name: personName
    };
    //only send one's name to themself once, TODO change to 0 times
    //this.sendToAllExcept(newUserName, name);
    this.connections.map((con) => {
      if(personName !== con.name) {
        con.socket.send(JSON.stringify(newUserName));
      }

      //send everyone's name to this new user
      let toNewUser: data.ServerMessageAddUser = {
        type: "adduser",
        name: con.name
      }
      socket.send(JSON.stringify(toNewUser));
    });
  }

  handleReplace(message: data.ClientMessageReplace, personFrom: string) {
    let packet: data.ServerMessageReplace = {
      type: "replace",
      name: personFrom,
      text: message.text,
      offset: message.offset
    };
    this.sendToAll(packet);
  }

  handleAppend(message: data.ClientMessageAppend, personFrom: string) {
    let packet: data.ServerMessageAppend = {
      type: "append",
      name: personFrom,
      text: message.text
    };
    console.log("sending " + JSON.stringify(packet));
    this.sendToAll(packet);
  }

  sendToAllExcept(packet: data.ServerMessageAppend, name: string) {
    this.connections.map((con) => {
      if(con.name !== name) {
        con.socket.send(JSON.stringify(packet))
      }
    });
  }

  sendToAll(packet: data.ServerMessage) {
    this.connections.map((con) => con.socket.send(JSON.stringify(packet)));
  }
}
