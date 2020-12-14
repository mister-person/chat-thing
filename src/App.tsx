import './App.css';
import {eventHandler} from './index';
import React from 'react';
import * as data from './chatData';

interface MessageProps {
  name: string,
  maxLines: number,
  width: number,
  initialText: string
}

interface MessageState {
  text: string,
  animating: boolean,
}

class Message extends React.Component<MessageProps, MessageState> {
  static defaultProps = {maxLines: 4, width: 500, initialText: ""};

  ref: React.RefObject<HTMLParagraphElement>;
  constructor(props: MessageProps) {
    super(props);
    this.state = {text: this.props.initialText, animating: false};

    this.appendText = this.appendText.bind(this);
    this.replaceText = this.replaceText.bind(this);

    this.ref = React.createRef();
  }

  componentDidMount() {
    //subscribe to update on name
    //TODO unregister these
    //TODO also I should probably be passing these in somehow
    eventHandler.onAppend(this.props.name, this.appendText);
    eventHandler.onReplace(this.props.name, this.replaceText);

    this.cutExtraLines(this.getLines());
  }

  componentDidUpdate() {
    if(this.ref.current != null) {

      const lines = this.getLines();
      //if there are more than maxLines lines, remove the top ones
      //and start the animation
      if(this.cutExtraLines(lines)) {
        if(!this.state.animating) {
          setTimeout(() => this.setState({animating: false}), 500);
          this.setState({
            animating: true,
          });
        }
      }

    }
  }

  cutExtraLines(lines: Array<string>) {
    if(lines.length > this.props.maxLines) {
      let linesToCut = lines.length - this.props.maxLines;
      this.setState({
        text: this.unfixNewline(lines.slice(linesToCut).join("")),
      });
      return true;
    }
    return false;
  }

  //seperate text into lines, detecting line breaks based on the
  //x position of each character, and delete extra lines
  getLines(): Array<string> {
    if(this.ref.current != null) {
      let lines: Array<string> = [];
      let lasty = Number.MAX_VALUE;
      let line = ""
      for(let child of Array.from(this.ref.current.children)) {
        let y = child.getBoundingClientRect().y;
        if(y > lasty) {
          lines.push(line);
          line = ""
        }
        line += child.textContent;
        lasty = y;
      }
      lines.push(line);
      return lines;
    }
    else {
      console.log("couldn't get ref for measuring lines, this shouldn't happen");
      return this.state.text.split("\n");
    }
  }

  appendText(text: string) {
    this.replaceText(text, 0);
  }

  replaceText(text: string, offset: number) {
    this.setState((oldState, _props) => {
      //can't use negative slice index because would be wrong for offset = 0
      let newText = oldState.text.slice(0, oldState.text.length - offset) + text;
      return {text: newText};
    });
  }

  //if a <p> ends with a newline apparently the newline doesn't show up, so I add another one
  fixNewline(text: string) {
    if(text.endsWith("\n")) {
      return text + "\n";
    }
    return text;
  }

  unfixNewline(text: string) {
    if(text.endsWith("\n\n")) {
      return text.slice(0, -1);
    }
    return text;
  }

  render() {
    return (
      <div className="message">
        <div className="message-name">
          <span className="message-name-span">
            {this.props.name}
          </span>
        </div>
          <p className={"message-text" + (this.state.animating ? " message-text-anim" : "")}>
            <span>
              {this.fixNewline(this.state.text).split("").map((ch) => <span>{ch}</span>)}
            </span>
          </p>
          <p style={{
              color: "blue",
              visibility: "hidden",
              fontSize:"20px",
              width:"500px",
              position:"fixed",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              overflowWrap: "break-word"
            }}>
            <span style={{outline: "solid"}} ref={this.ref}>
              {this.fixNewline(this.state.text).split("").map((ch) => <span>{ch}</span>)}
            </span>
          </p>
      </div>
    )
  }
}

interface MessagelistState {
  messages: Array<{name: string, initialText?: string}>,
  roomName: string
}

class MessageList extends React.Component<{}, MessagelistState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      messages: [],
      roomName: ""
    };

    this.addUser = this.addUser.bind(this);
    this.removeUser = this.removeUser.bind(this);
    this.newRoom = this.newRoom.bind(this);
    //this.receivePacket = this.receivePacket.bind(this);
  }

  componentDidMount() {
    //TODO unregister these
    eventHandler.onAddUser(this.addUser);
    eventHandler.onDelUser(this.removeUser);
    eventHandler.onNewRoom(this.newRoom);
  }

  componentWillUnmount() {
    //todo unregister callback
  }

  addUser(name: string) {
    let newMessages = [...this.state.messages];
    newMessages.push({name});
    this.setState({messages: newMessages});
  }

  removeUser(name: string) {
    let newMessages = this.state.messages.filter((message) => message.name !== name);
    this.setState({messages: newMessages});
  }

  newRoom(room: string, users: Array<{name: string, hist: string}>) {
    let newMessages = users.map(user => {return {name: user.name, initialText: user.hist}});
    console.log("joining new room " + JSON.stringify(newMessages));
    this.setState({messages: newMessages, roomName: room});
  }

  render() {
    return (
      <>
        <div className="room-name">
          {this.state.roomName}
        </div>
        <div className="message-list">
          {this.state.messages.map((message) => 
            <Message key={[this.state.roomName, message.name].toString()} name={message.name} initialText={message.initialText}/>
          )}
        </div>
      </>
    );
  }
}

interface ChatInputState {
  text: string,
  unsentText: string,
  unsentOffset: number
};

interface ChatInputProps {
  currentRoom: string | null,
  replaceCallback: (text: string, offset: number) => void,
}

class ChatInput extends React.Component<ChatInputProps, ChatInputState> {
  constructor(props: ChatInputProps) {
    super(props);

    this.state = {text: "", unsentText: "", unsentOffset: 0};

    this.handleChange = this.handleChange.bind(this);
  }

  componentDidUpdate(prevProps: ChatInputProps, _prevState: ChatInputState) {
    if(this.state.unsentText !== "" || this.state.unsentOffset !== 0) {
      this.props.replaceCallback(this.state.unsentText, this.state.unsentOffset);
      this.setState({unsentText: "", unsentOffset: 0});
    }

    if(prevProps.currentRoom !== this.props.currentRoom) {
      this.setState({text: "", unsentText: "", unsentOffset: 0});
    }
  }

  shouldComponentUpdate(nextProps: ChatInputProps, nextState: ChatInputState) {
    if(this.state.text === nextState.text && this.props === nextProps) {
      if(nextState.unsentText === "" && nextState.unsentOffset === 0) {
        return false;
      }
    }
    return true;
  }

  handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    this.setState((prevState, _props) => {

      let newText = event.target.value;
      let oldText = prevState.text;

      //calculate what new text was added to text box
      //offset is how many characters from the right of
      //the old text box value have changed
      let offset = oldText.length;
      for(let i = 0; i < newText.length; i++) {
        //if newText[i] overflows, it is undefined,
        //which exits the loop with offset 0 as it should
        if(newText[i] !== oldText[i]) {
          break;
        }
        offset--;
      }
      var textToAppend = newText.slice(oldText.length - offset);

      //TODO test with no updates
      let newUnsentText = prevState.unsentText.slice(0, prevState.unsentText.length - offset);
      newUnsentText += textToAppend;
      let newOffset = offset - prevState.unsentText.length;
      if(newOffset < 0) {
        newOffset = 0;
      }
      newOffset += prevState.unsentOffset;

      //TODO magic number
      newText = newText.slice(-10);
      //trim everything before any newline, unless it ends with newline
      newText = newText.replace(/^.*\n([^\n])/g, (_, p1) => p1);
      return {
        text: newText,
        unsentText: newUnsentText,
        unsentOffset: newOffset
      };
    });
  }

  render() {
    return (
      <textarea className="chat-input" autoFocus value={this.state.text} onChange={this.handleChange}>
          
      </textarea>
    )
  }
}

type NameInputProps = {
  nameCallback: (name: string) => void,
  newNameCallback: (newName: string) => void
};

class NameInput extends React.Component<NameInputProps, {message: string | null}> {
  inputRef: React.RefObject<HTMLInputElement>;
  disconnectCallback: NodeJS.Timeout | null = null;
  
  constructor(props: NameInputProps) {
    super(props);

    this.state = {message: null};

    this.inputRef = React.createRef();
    
    this.handleNameResponse = this.handleNameResponse.bind(this);
  }

  componentDidMount() {
    eventHandler.onName(this.handleNameResponse);
  }

  handleNameResponse(newName: string, isTaken: boolean) {
    if(this.disconnectCallback != null) {
      clearTimeout(this.disconnectCallback);
      this.disconnectCallback = null;
    }

    if(isTaken) {
      this.setState({message: newName});
    }
    else {
      this.props.newNameCallback(newName);
    }
  }

  sendNameRequest() {
    console.log(this.inputRef.current?.value);
    if(this.inputRef.current !== null) {
      this.props.nameCallback(this.inputRef.current.value);
    }

    //show disconnect message if server doesn't respond within 2 seconds
    this.disconnectCallback = setTimeout(() => {
      this.setState({message: "disconnected from server"});
    }, 2000);
  }

  render() {
    return (
      <form className="name-input">
        <input className="name-input-text" type="text" autoFocus ref={this.inputRef}>
          
        </input>
        <br/>
        <label className="name-input-label">
          {this.state.message === null ? "" : this.state.message}
        </label>
        <br/>
        <input className="name-input-submit" type="submit" value="pick name" onClick={(e) => {
          e.preventDefault();
          this.sendNameRequest()
        }}>
          
        </input>
      </form>
    )
  }
}

interface RoomListState {
  rooms: Array<{name: string, usrcount: number}>,
  roomDialogue: boolean,
  roomDialogueText: string,
}

interface RoomListProps {
  visible: boolean,
  currentRoom: string | null,
  joinRoomCallback: (name: string) => void,
  onRoomChange: (name: string) => void,
}

class RoomList extends React.Component<RoomListProps, RoomListState> {
  mouseOver = false;
  updatedRooms: Array<{name: string, usrcount: number}> | null = null;

  constructor(props: RoomListProps) {
    super(props);

   this.state = {
      rooms: [],
      roomDialogue: false,
      roomDialogueText: "",
    }

    this.roomListCallback = this.roomListCallback.bind(this);

    this.onClick = this.onClick.bind(this);
    this.onJoinRoomSuccess = this.onJoinRoomSuccess.bind(this);
    this.newRoomClick = this.newRoomClick.bind(this);
    this.onMouseOver = this.onMouseOver.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
  }

  componentDidMount() {
    eventHandler.onRoomList(this.roomListCallback);
    eventHandler.onNewRoom(this.onJoinRoomSuccess);
  }

  roomListCallback(rooms: Array<{name: string, usrcount: number}>) {
    rooms.sort((room1, room2) => room2.usrcount - room1.usrcount);
    if(this.mouseOver) {
      this.updatedRooms = rooms.slice();

      //only update the user count of rooms for now, not the order or the content
      this.setState((oldState, _props) => {
        let newCountRooms = oldState.rooms.map(oldroom => {
          //extract the user count from the new room list
          let newusrcount = rooms.find(newroom => oldroom.name === newroom.name)?.usrcount;
          if(newusrcount !== undefined) {
            return {name: oldroom.name, usrcount: newusrcount};
          }
          else {
            return oldroom;
          }
        });
        return {rooms: newCountRooms};
      });
    }
    else {
      this.setState({rooms});
    }
  }

  onJoinRoomSuccess(room: string) {
    this.props.onRoomChange(room);
  }

  onClick(event: React.MouseEvent<HTMLDivElement, MouseEvent>, name: string) {
    event.preventDefault();
    this.props.joinRoomCallback(name);
  }

  newRoomClick(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    event.preventDefault();
    this.setState({roomDialogue: true});
  }

  newRoomSend(e: React.FormEvent) {
    e.preventDefault();
    this.props.joinRoomCallback(this.state.roomDialogueText);
    this.setState({roomDialogue: false, roomDialogueText: ""});
  }

  onMouseOver() {
    this.mouseOver = true;
  }

  onMouseOut() {
    this.mouseOver = false;
    if(this.updatedRooms != null) {
      this.setState({rooms: this.updatedRooms});
      this.updatedRooms = null;
    }
  }

  render() {
    return (
      <div
        style={{visibility: this.props.visible ? "visible" : "hidden"}}
        className="room-list"
        onMouseEnter={this.onMouseOver}
        onMouseLeave={this.onMouseOut}>

        {this.state.rooms.map(room => {
          let selected = this.props.currentRoom !== null && this.props.currentRoom === room.name;
          return (
            <div onClick={(e) => this.onClick(e, room.name)} className={selected ? "room-selected" : "room"}>
              {room.name + " (" + room.usrcount + ")"}
            </div>
          )
        })}
        <div onClick={this.newRoomClick} className={this.state.roomDialogue ? "room-selected" : "room"}>
          + new room...
        </div>
        {this.state.roomDialogue && 
          <form onSubmit={(e) => {this.newRoomSend(e)}}>
            <input
              onBlur={() => this.setState({roomDialogue: false, roomDialogueText: ""})}
              onChange={((e) => {this.setState({roomDialogueText: e.target.value})})}
              value={this.state.roomDialogueText}
              type="text" autoFocus>

            </input>
          </form>
        }
      </div>
    )
  }
}

interface AppProps {
  //replaceCallback: (text: string, offset: number) => void,
  //nameCallback: (name: string) => void,
  //joinRoomCallback: (name: string) => void,
  //logoutCallback: () => void,
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


    //this.props.nameCallback("naim");
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
    this.state.socket.addEventListener("close", this.socketCloseCallback);
  }

  socketCloseCallback = (event: CloseEvent) => {
    console.log("socket closed because '", event.reason, "' trying to reconnect");
    this.setState({connected: false});

    const protocol = ((window.location.protocol === "https:") ? "wss://" : "ws://");
    const socket = new WebSocket(protocol + window.location.host + "/chat");
    this.setState({socket});

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
        {this.state.connected || 
          <h1 style={{color: "red", position: "fixed", textAlign: "center", left: "0px", right: "0px", background: "black"}}>
            disconnected from server
          </h1>
        }
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
      </div>
    );
  }
}

export default App;
