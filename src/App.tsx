import './App.css';
import {eventHandler} from './index';
import React from 'react';
import * as data from './chatData';
import {RoomList} from './components/roomList';
import {NameInput} from './components/nameInput';
import {MessageList} from './components/messageList';
import {ChatInput} from './components/chatInput';

interface AppProps {
  socket: WebSocket,
}

interface AppState {
  name: string | null,
  currentRoom: string | null,
  socket: WebSocket,
  connected: boolean,
}

class App extends React.Component<AppProps, AppState> {

  constructor(props: AppProps) {
    super(props);

    this.state = {
      name: null,
      currentRoom: null,
      socket: this.props.socket,
      connected: true,
    }

    this.setName = this.setName.bind(this);
    this.changeRoomCallback = this.changeRoomCallback.bind(this);
    this.logout = this.logout.bind(this);
    this.logoutCallback = this.logoutCallback.bind(this);
    this.replaceCallback = this.replaceCallback.bind(this);
    this.nameCallback = this.nameCallback.bind(this);
    this.joinRoomCallback = this.joinRoomCallback.bind(this);
    this.socketCloseCallback = this.socketCloseCallback.bind(this);
  }

  componentDidMount() {
    //try to reconnect if disconnected. 
    this.state.socket.addEventListener("close", this.socketCloseCallback);
  }

  socketCloseCallback = (event: CloseEvent) => {
    console.log("socket closed because '", event.reason, "' trying to reconnect");
    this.setState({connected: false});

    const protocol = ((window.location.protocol === "https:") ? "wss://" : "ws://");
    const socket = new WebSocket(protocol + window.location.host + "/chat");
    this.setState({socket});

    //keep trying to reconnect if this one fails.
    socket.addEventListener("close", (event: CloseEvent) => {
      setTimeout(() => this.socketCloseCallback(event), 2000)
    });

    socket.addEventListener("error", (_ev) => {
      console.log("socket error", _ev);
    });
    socket.addEventListener("open", (_event) => {
      console.log("new socket open");
      this.setState({connected: true});
      eventHandler.newSocket(socket);
    });
  }

  logout(_event: React.MouseEvent<HTMLDivElement>) {
    this.setState({name: null, currentRoom: null});
    this.logoutCallback();
  }

  setName(newName: string) {
    this.setState({name: newName});
  }

  changeRoomCallback(newRoom: string) {
    this.setState({currentRoom: newRoom});
  }

  replaceCallback(text: string, offset: number) {
    console.log("in replace callback");
    this.state.socket.send(JSON.stringify({type: "replace", text, offset}));
  }

  nameCallback(name: string) {
    console.log("in name callback");
    let request = JSON.stringify({
      type: "name",
      name: name
    });
    if(this.state.socket.readyState === this.state.socket.OPEN) {
      this.state.socket.send(request);
    }
    else {
      this.state.socket.addEventListener("open", () => {
        this.state.socket.send(request);
      });
    }
  }

  joinRoomCallback(name: string) {
    console.log("in join room callback");
    let request: data.ClientMessageJoinRoom = {
      type: "joinroom",
      name: name
    };
    this.state.socket.send(JSON.stringify(request));
  }

  logoutCallback() {
    this.state.socket.send(JSON.stringify({type: "logout"}));
  }
  
  render() {
    console.log("name", this.state.name);
    return (
      <div className="App">
        {this.state.name && <input type="button" value="Logout" className="logout-button" onClick={this.logout}/>}
        <RoomList
          visible={this.state.name != null}
          joinRoomCallback={this.joinRoomCallback}
          onRoomChange={this.changeRoomCallback}
          currentRoom={this.state.currentRoom}
          />
        {this.state.name == null ? 
          <NameInput newNameCallback={this.setName} nameCallback={this.nameCallback}/>
          :
          <div className="main">
            <MessageList/>
            <ChatInput
              currentRoom={this.state.currentRoom}
              replaceCallback={this.replaceCallback}/>
          </div>
        }
        {this.state.connected || 
          <h1 style={{color: "red", position: "fixed", textAlign: "center", left: "0px", right: "0px", background: "black"}}>
            disconnected from server
          </h1>
        }
      </div>
    );
  }
}

export default App;
