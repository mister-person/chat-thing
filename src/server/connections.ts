import * as WebSocket from 'ws';
import * as data from '../chatData';

export class Connections {
  connections: Array<{name: string, socket: WebSocket}>;
  pid: number;

  constructor() {
    this.connections = [];
    this.pid = 0
  }
  
  newConnection(socket: WebSocket) {
    let name = "Person" + this.pid;
    this.pid++;
    this.connections.push({name: name, socket});

    console.log(`new person ${name}`);

    //send this new user's name to everyone
    let newUserName: data.ServerMessageAddUser = {
      type: "adduser",
      name: name
    };
    //only send one's name to themself once, TODO change to 0 times
    //this.sendToAllExcept(newUserName, name);
    this.connections.map((con) => {
      if(name !== con.name) {
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
      console.log(`close ${code} because ${reason} for ${name}`);
      this.connections = this.connections.filter((connection) => connection.socket !== socket);
      let deluserpacket: data.ServerMessageDelUser = {
        type: "deluser",
        name: name
      }
      this.sendToAll(deluserpacket);
      //for(let i = 0; i < this.connections.length; i++) {
        //this.connections[i].socket.send(JSON.stringify(deluserpacket));
      //}
    });

    //TODO oh my god split up this function
    socket.on("message", (message: WebSocket.Data) => {
      if(typeof(message) === "string") {
        console.log(message);
        if(message.startsWith("ping")) {
            socket.send("pong " + message.slice(4));
        }
        try {
          let messageJson = JSON.parse(message);
          if(data.validateClientMessage(messageJson)) {
            if(messageJson.type == "append") {
              let packet: data.ServerMessageAppend = {
                type: "append",
                name: name,
                text: messageJson.text
              };
              console.log("sending " + JSON.stringify(packet));
              this.sendToAll(packet);
              //for(let i = 0; i < this.connections.length; i++) {
                //this.connections[i].socket.send(JSON.stringify(packet));
              //}
            }
            if(messageJson.type == "replace") {
              let packet: data.ServerMessageReplace = {
                type: "replace",
                name: name,
                text: messageJson.text,
                offset: messageJson.offset
              };
              console.log("sending " + JSON.stringify(packet));
              this.sendToAll(packet);
              //for(let i = 0; i < this.connections.length; i++) {
                //this.connections[i].socket.send(JSON.stringify(packet));
              //}
            }
          }
        } catch(e) { }
      }
    });
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
