import express from "express";
import * as http from "http";
import * as WebSocket from "ws";
import session from "express-session";

import {Server} from './connections';
import * as data from './../chatData';

const app = express();

//old shell stuff
//"tsc server/start.ts; trap 'kill $BGPID; exit' INT; node server/start.js 3001& BGPID=$! BROWSER=none react-scripts start",

//const hostname = '127.0.0.1';
//const hostname = '10.0.0.230';
var port = 3000;
if(process.argv.length > 2) {
    var argPort = Number.parseInt(process.argv[2]);
    if(!Number.isNaN(argPort)) {
        port = argPort;
    }
}
console.log("starting on port " + port);

app.use(express.static("build"));

const sessionParser = session({
  secret: "asdf",
  resave: true,
  saveUninitialized: true,
});
app.use(sessionParser);

app.use((_, res) => {
    res.type('html').sendStatus(404);
});

const server = app.listen(port, () => {
    //console.log("connection");
});

const wsServer = new WebSocket.Server({noServer: true});

server.on('upgrade', (request, socket, head) => {
  //TODO actually check url
  console.log("upgrade request");
  sessionParser(request, socket, () => {
    if(request.sessionID === undefined) {
      socket.destroy();
      return;
    }
    console.log("session id:", request.sessionID);
    console.log("session:", request.session);
    console.log("cookie:", (request as http.IncomingMessage).headers.cookie);
    wsServer.handleUpgrade(request, socket, head, socket => {
      wsServer.emit('connection', socket, request);
    });
  });
});

wsServer.on("error", (_socket: WebSocket, err: Error) => {
  console.log(JSON.stringify(err));
});

const connections = new Server();
wsServer.on("connection", (socket: WebSocket, request: http.IncomingMessage & {session?: any, sessionID: any}) => {
  let sessionID = undefined;
  if(request.sessionID !== undefined && typeof(request.sessionID) === "string") {
    sessionID = request.sessionID;
  }
  else {
    socket.close();
    return;
  }
  connections.newConnection(socket, sessionID);
});

//let people know if server closes, when ctrl-c is pressed
process.on('SIGINT', function() {
  console.log("Caught interrupt signal");

  connections.sendToAll({type: "adduser", name: "SERVER"});
  let msgText =  "Server Shutting Down (I might just be restarting it)";
  let msgPacket: data.ServerMessageReplace = {type: "replace", name: "SERVER", text: msgText, offset: 0};
  connections.sendToAll(msgPacket);
  process.exit();
});

//server.on("connection", () => {console.log("connection.")});
//server.on("request", () => {console.log("request.")});
