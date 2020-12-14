import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import {ChatEventHandler} from './clientEventHandler';

//work around bug in create-react-app
fetch("/chat/");

const protocol = ((window.location.protocol === "https:") ? "wss://" : "ws://")
const socket = new WebSocket(protocol + window.location.host + "/chat");

export let eventHandler = new ChatEventHandler(socket);

//TODO list:
//logging in (maybe)
//database for room names, sessions
//expire sessions
//all the other //TODOs
//moar comments lol
//choosing colors/colored chat rooms?
//history in typey box
//afk, change title when there's unread
//drag and drop message boxes
//only send room list chagnes

ReactDOM.render(
  <React.StrictMode>
    <App
      socket = {socket}
    />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
