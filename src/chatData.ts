import * as rt from "runtypes";

export const ServerMessageAppend = rt.Record({
  type: rt.Literal("append"),
  name: rt.String,
  text: rt.String
});
export type ServerMessageAppend = rt.Static<typeof ServerMessageAppend>;

export const ServerMessageReplace = rt.Record({
  type: rt.Literal("replace"),
  name: rt.String,
  text: rt.String,
  offset: rt.Number
});
export type ServerMessageReplace  = rt.Static<typeof ServerMessageReplace>;

export const ServerMessageAddUser = rt.Record({
  type: rt.Literal("adduser"),
  name: rt.String
});
export type ServerMessageAddUser  = rt.Static<typeof ServerMessageAddUser>;

export const ServerMessageDelUser = rt.Record({
  type: rt.Literal("deluser"),
  name: rt.String
});
export type ServerMessageDelUser  = rt.Static<typeof ServerMessageDelUser>;

export const ServerMessageNameResponse = rt.Record({
  type: rt.Literal("name"),
  isTaken: rt.Boolean,
  newName: rt.String
});
export type ServerMessageNameResponse  = rt.Static<typeof ServerMessageNameResponse>;

export const ServerMessage = rt.Union(ServerMessageReplace, 
  ServerMessageAppend,
  ServerMessageAddUser,
  ServerMessageDelUser,
  ServerMessageNameResponse);
export type ServerMessage  = rt.Static<typeof ServerMessage>;

export const ClientMessageAppend = rt.Record({
  type: rt.Literal("append"),
  text: rt.String
});
export type ClientMessageAppend  = rt.Static<typeof ClientMessageAppend>;

export const ClientMessageReplace = rt.Record({
  type: rt.Literal("replace"),
  text: rt.String,
  offset: rt.Number
});
export type ClientMessageReplace  = rt.Static<typeof ClientMessageReplace>;

export const ClientMessageRequestName = rt.Record({
  type: rt.Literal("name"),
  name: rt.String
});
export type ClientMessageRequestName  = rt.Static<typeof ClientMessageRequestName>;

export const ClientMessage = rt.Union(ClientMessageAppend, ClientMessageReplace, ClientMessageRequestName);
export type ClientMessage  = rt.Static<typeof ClientMessage>;
