import express from "express";
import * as http from "http";
import * as WebSocket from "ws";

import {Connections} from './connections';

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

app.get("/a", (req, res) => {
    console.log("url " + req.url);
    console.log("baseUrl " + req.baseUrl);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.send('test');
    //res.status(404).end();
    //res.end('Hello World');
});

app.use((_, res) => {
    res.type('html').sendStatus(404);
});

const server = app.listen(port, () => {
    //console.log("thingie");
});

const wsServer = new WebSocket.Server({noServer: true});
const connections = new Connections();
wsServer.on("connection", (socket: WebSocket, _request: http.IncomingMessage) => {
  connections.newConnection(socket);
});

process.on('SIGINT', function() {
  console.log("Caught interrupt signal");

  for(let i = 0; i < connections.connections.length; i++) {
    connections.connections[i].socket.send(JSON.stringify({type: "adduser", name: "SERVER"}));
    connections.connections[i].socket.send(JSON.stringify({type: "replace", name: "SERVER", text: "Server Shutting Down", offset: 0}));
  }

  process.exit();
});

server.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, socket => {
        wsServer.emit('connection', socket, request);
    });
});

