import * as WebSocket from 'ws';
import * as data from '../chatData';

//TODO some chat history

export class Connections {
  connections: Array<{name: string, socket: WebSocket}>;
  pid: number;

  constructor() {
    this.connections = [];
    this.pid = 0
  }
  
  newConnection(socket: WebSocket) {
    let personName = "Person" + this.pid;
    this.pid++;
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

    socket.on("close", (code: number, reason: string) => {
      console.log(`close ${code} because "${reason}" for ${personName}`);
      this.connections = this.connections.filter((connection) => connection.socket !== socket);
      let deluserpacket: data.ServerMessageDelUser = {
        type: "deluser",
        name: personName
      }
      this.sendToAll(deluserpacket);
    });

    //TODO oh my god split up this function
    socket.on("message", (message: WebSocket.Data) => {
      if(typeof(message) === "string") {
        console.log(message);
        if(message.startsWith("ping")) {
            socket.send("pong " + message.slice(4));
            return;
        }
        try {
          let messageJson = JSON.parse(message);
          if(data.validateClientMessage(messageJson)) {
            if(messageJson.type == "append") {
              this.handleAppend(messageJson, personName);
            }
            if(messageJson.type == "replace") {
              this.handleReplace(messageJson, personName);
            }
          }
        } catch(e) {
          console.log("error handling message: " + e);
        }
      }
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

  sendToAllExcept(packet: data.ServerMessage, name: string) {
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
