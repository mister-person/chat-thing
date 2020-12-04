import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import {ChatEventHandler} from './clientEventHandler';
import * as data from './chatData';

const protocol = ((window.location.protocol === "https:") ? "wss://" : "ws://")
const socket = new WebSocket(protocol + window.location.host + "/chat");

export let eventHandler = new ChatEventHandler(socket);

//TODO list:
//user names can't have spaces
//logging in, at least remember name
//moar comments lol
//choosing colors/colored chat rooms?
//warn if not connected, 
//in chat and choose name
//and reconnecting
//history in typey box
//all the other //TODOs

//TODO put these somewhere else
//TODO and remember the one in app.tsx
let appendCallback = function(text: string) {
  replaceCallback(text, 0);
}

//TODO if socket down, cache and wait
let replaceCallback = function(text: string, offset: number) {
  console.log("in replace callback");
  socket.send(JSON.stringify({type: "replace", text, offset}));
}

let nameCallback = function(name: string) {
  console.log("in name callback");
  let request = JSON.stringify({
    type: "name",
    name: name
  });
  if(socket.readyState === socket.OPEN) {
    socket.send(request);
  }
  else {
    socket.addEventListener("open", () => {
      socket.send(request);
    });
  }
}

let joinRoomCallback = function(name: string) {
  console.log("in join room callback");
  let request: data.ClientMessageJoinRoom = {
    type: "joinroom",
    name: name
  };
  socket.send(JSON.stringify(request));
}

//work around bug in create-react-app
fetch("/chat/");

ReactDOM.render(
  <React.StrictMode>
    <App appendCallback={appendCallback} replaceCallback={replaceCallback} nameCallback={nameCallback} joinRoomCallback={joinRoomCallback}/>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
