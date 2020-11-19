export interface ServerMessageAppend {
  type: "append",
  name: string,
  text: string
}

export interface ServerMessageReplace {
  type: "replace",
  name: string,
  text: string,
  offset: number
}

export interface ServerMessageAddUser {
  type: "adduser",
  name: string
}

export interface ServerMessageDelUser {
  type: "deluser",
  name: string
}

//TODO add/del user + 
export type ServerMessage = ServerMessageReplace | ServerMessageAppend | ServerMessageAddUser | ServerMessageDelUser;

export interface ClientMessageAppend {
  type: "append",
  text: string
}

export interface ClientMessageReplace {
  type: "replace",
  text: string,
  offset: number
}

export type ClientMessage = ClientMessageReplace | ClientMessageAppend;

//meh I don't like it
export function validateClientMessage(jsonMessage: any): jsonMessage is ClientMessage {
  if(typeof(jsonMessage) !== "object") { return false; }
  if(jsonMessage.type === "append") {
    if(typeof(jsonMessage.text) === "string") {
      return true;
    }
  }
  else if(jsonMessage.type === "replace") {
    if(typeof(jsonMessage.text) === "string" && typeof(jsonMessage.offset) === "number") {
      return true;
    }
  }
  return false;
}

//meh I don't like this one either
export function validateServerMessage(jsonMessage: any): jsonMessage is ServerMessage {
  if(typeof(jsonMessage) !== "object") { return false; }
  if(jsonMessage.type === "append") {
    if(typeof(jsonMessage.name) === "string" && typeof(jsonMessage.text) === "string") {
      return true;
    }
  }
  else if(jsonMessage.type === "replace") {
    if(typeof(jsonMessage.name) === "string" &&
        typeof(jsonMessage.text) === "string" &&
        typeof(jsonMessage.offset) === "number") {
      return true;
    }
  }
  else if(jsonMessage.type === "adduser") {
    if(typeof(jsonMessage.name) === "string") {
      return true;
    }
  }
  else if(jsonMessage.type === "deluser") {
    if(typeof(jsonMessage.name) === "string") {
      return true;
    }
  }
  return false;
}
