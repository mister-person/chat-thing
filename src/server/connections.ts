import * as WebSocket from 'ws';
import * as data from '../chatData';
//import * as rt from 'runtypes';

//TODO some chat history

type Person = {name: string, chatHistory: string, socket: WebSocket};

export class Connections {
  connections: Array<Person>;

  constructor() {
    this.connections = [];
  }
  
  newConnection(socket: WebSocket) {
    let person: Person | null = null;

    console.log("connections length: " + this.connections.length);

    socket.on("error", (socket: any, err: any) => {
      console.log("error on socket");
      console.log(JSON.stringify(err));
      console.log(JSON.stringify(socket));
    });

    socket.on("close", (code: number, reason: string) => {
      console.log(`close ${code} because "${reason}" for ${person}`);
      if(person !== null) {
        this.connections = this.connections.filter((connection) => connection.socket !== socket);
        let deluserpacket: data.ServerMessageDelUser = {
          type: "deluser",
          name: person.name
        }
        this.sendToAll(deluserpacket);
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
          if(person === null) {
            if(data.ClientMessageRequestName.guard(messageJson)) {
              person = this.handleNameRequest(messageJson, socket);
            }
          }
          else {
            if(data.ClientMessageAppend.guard(messageJson)) {
              this.handleAppend(messageJson, person);
            }
            if(data.ClientMessageReplace.guard(messageJson)) {
              this.handleReplace(messageJson, person);
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

  handleNameRequest(jsonMessage: data.ClientMessageRequestName, socket: WebSocket): Person | null {
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
      let person: Person = {
        name: jsonMessage.name,
        socket: socket,
        chatHistory: ""
      }
      this.logIn(person);
      return person;
    }
  }

  logIn(person: Person) {
    let nameResponse: data.ServerMessageNameResponse = {
      type: "name",
      newName: person.name,
      isTaken: false
    };
    person.socket.send(JSON.stringify(nameResponse));

    this.connections.push(person);

    console.log(`new person ${person.name}`);

    //send this new user's name to everyone
    let newUserName: data.ServerMessageAddUser = {
      type: "adduser",
      name: person.name
    };
    //only send one's name to themself once, TODO change to 0 times
    //this.sendToAllExcept(newUserName, name);
    this.connections.map((con) => {
      if(person.name !== con.name) {
        con.socket.send(JSON.stringify(newUserName));
      }

      //send everyone's name to this new user
      let toNewUser: data.ServerMessageAddUser = {
        type: "adduser",
        name: con.name
      }
      person.socket.send(JSON.stringify(toNewUser));
      let history: data.ServerMessageReplace = {
        type: "replace",
        name: con.name,
        text: con.chatHistory,
        offset: 0
      }
      person.socket.send(JSON.stringify(history));
    });
  }

  handleReplace(message: data.ClientMessageReplace, personFrom: Person) {
    let packet: data.ServerMessageReplace = {
      type: "replace",
      name: personFrom.name,
      text: message.text,
      offset: message.offset
    };
    this.sendToAll(packet);
    let slice = personFrom.chatHistory.slice(0, personFrom.chatHistory.length - message.offset)
    if(personFrom.chatHistory.length - message.offset < 0) {
      slice = "";//TODO maybe test this
    }
    let newText = slice + message.text;
    personFrom.chatHistory = newText.slice(-50);
  }

  handleAppend(message: data.ClientMessageAppend, personFrom: Person) {
    console.log("got an append: " + JSON.stringify(message));
    let replace: data.ClientMessageReplace = {...message, type: "replace", offset: 0};
    this.handleReplace(replace, personFrom);
  /*
    let packet: data.ServerMessageAppend = {
      type: "append",
      name: personFrom,
      text: message.text
    };
    console.log("sending " + JSON.stringify(packet));
    this.sendToAll(packet);
  */
  }

  sendToAllExcept(packet: data.ServerMessageAppend, person: Person) {
    this.connections.map((con) => {
      if(con.name !== person.name) {
        con.socket.send(JSON.stringify(packet))
      }
    });
  }

  sendToAll(packet: data.ServerMessage) {
    this.connections.map((con) => con.socket.send(JSON.stringify(packet)));
  }
}
