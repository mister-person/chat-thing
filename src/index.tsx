import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import {ChatEventHandler} from './clientEventHandler'

const protocol = ((window.location.protocol === "https:") ? "wss://" : "ws://")
const socket = new WebSocket(protocol + window.location.host + "/chat");

export let eventHandler = new ChatEventHandler(socket);

//TODO put these somewhere else
let appendCallback = function(text: string) {
  replaceCallback(text, 0);
}

//TODO if socket down, cache and wait
let replaceCallback = function(text: string, offset: number) {
  socket.send(JSON.stringify({type: "replace", text, offset}));
}

ReactDOM.render(
  <React.StrictMode>
    <App appendCallback={appendCallback} replaceCallback={replaceCallback} socket={socket}/>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
