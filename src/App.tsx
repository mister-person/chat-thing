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

class Message extends React.Component<MessageProps, {text: string}> {
  static defaultProps = {maxLines: 4, width: 500, initialText: ""};

  ref: React.RefObject<HTMLParagraphElement>;
  constructor(props: MessageProps) {
    super(props);
    this.state = {text: this.props.initialText};

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
  }

  componentDidUpdate() {
    if(this.ref.current != null) {
      const textContentSave = this.ref.current.textContent;
      this.ref.current.textContent = this.fixNewline(this.state.text);
      let rects = this.ref.current.getClientRects();
      let numLines = rects.length;

      //TODO make this less spaghetti
      //I want to delete only the top line if there are
      //more than maxLines lines, but I couldn't find a way
      //to find where the line breaks, only how many lines there
      //are and how long they are in pixels ...? so this deletes
      //one character at a time until there's 1 fewer line and 
      //the first and last remaining line are the same length as before.
      if(numLines > this.props.maxLines) {
        let lastLineRight = rects[numLines - 1].right;
        let firstLineRight = rects[1].right;
        let numLinesStart = numLines;

        if(this.ref.current.textContent !== null) {
          const text = this.ref.current.textContent;

          for(var i = 0; i < text.length; i++) {
            this.ref.current.textContent = text.slice(i);

            rects = this.ref.current.getClientRects();
            numLines = rects.length;
            if(numLines < numLinesStart) {
              if(rects[numLines - 1].right === lastLineRight && rects[0].right <= firstLineRight) {
                console.log("breaking");
                break;
              }
            }
          }
          this.setState({text: this.unfixNewline(this.ref.current.textContent)});
        }
      }
      
      this.ref.current.textContent = textContentSave;
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

  //if a <p> ends with a newline apparently it doesn't show up, so I add another one
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
    console.log("text: " + this.state.text);
    return (
      <div className="message">
        <div className="message-name">
          <span className="message-name-span">
            {this.props.name}
          </span>
        </div>
          <p className="message-text">
            <span>
              {this.fixNewline(this.state.text)}
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
            <span ref={this.ref}>
              {this.fixNewline(this.state.text)}
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
            <Message key={this.state.roomName + " " + message.name} name={message.name} initialText={message.initialText}/>
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

//TODO specify type of props
class ChatInput extends React.Component<any, ChatInputState> {
  constructor(props: any) {
    super(props);

    this.state = {text: "", unsentText: "", unsentOffset: 0};

    this.handleChange = this.handleChange.bind(this);
  }

  componentDidUpdate(_prevProps: any, prevState: ChatInputState) {
    if(this.state.unsentText !== "" || this.state.unsentOffset !== 0) {
      this.props.replaceCallback(this.state.unsentText, this.state.unsentOffset);
      this.setState({unsentText: "", unsentOffset: 0});
    }
  }

  shouldComponentUpdate(nextProps: any, nextState: ChatInputState) {
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

      newText = newText.slice(-10);
      //trim everything before any newline, unless it ends with newline
      newText = newText.replace(/^.*\n([^\n])/g, (_, p1) => p1);
      //TODO magic number
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
  }

  render() {
    return (
      <form>
        <input type="text" autoFocus ref={this.inputRef}>
          
        </input>
        <br/>
        <label>
          {this.state.message === null ? "" : this.state.message}
        </label>
        <br/>
        <input type="submit" value="pick name" onClick={(e) => {
          e.preventDefault();
          this.sendNameRequest()
        }}>
          
        </input>
      </form>
    )
  }
}

interface RoomListState {
  rooms: Array<{name: string}>
}

interface RoomListProps {
  visible: boolean,
  current?: string,
  joinRoomCallback: (name: string) => void
}

class RoomList extends React.Component<RoomListProps, RoomListState> {
  constructor(props: RoomListProps) {
    super(props);

    this.state = {
      rooms: [{name: "asdf"}]
    }

    this.roomListCallback = this.roomListCallback.bind(this);

    this.onClick = this.onClick.bind(this);
  }

  componentDidMount() {
    eventHandler.onRoomList(this.roomListCallback);
  }

  roomListCallback(rooms: Array<{name: string}>) {
    this.setState({rooms});
  }

  onClick(event: React.MouseEvent<HTMLDivElement, MouseEvent>, name: string) {
    event.preventDefault();
    this.props.joinRoomCallback(name);
  }

  render() {
    return (
      <div style={{visibility: this.props.visible ? "visible" : "hidden"}} className="room-list">
        {this.state.rooms.map(room => {
          let selected = this.props.current !== null && this.props.current === room.name;
          return (
            <div onClick={(e) => this.onClick(e, room.name)} className={selected ? "room" : "selected-room"}>
              {room.name}
            </div>
          )
        })}
      </div>
    )
  }
}

interface AppProps {
  appendCallback: (text: string) => void,
  replaceCallback: (text: string, offset: number) => void,
  nameCallback: (name: string) => void,
  joinRoomCallback: (name: string) => void
}

interface AppState {
  name: string | null,
}

class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);

    this.state = {
      name: null,
    }

    this.props.nameCallback("naim");

    this.newNameCallback = this.newNameCallback.bind(this);
  }

  newNameCallback(newName: string) {
    this.setState({name: newName});
  }

  render() {
    return (
      <div className="App">
        <RoomList visible={this.state.name != null} joinRoomCallback={this.props.joinRoomCallback}/>
        {this.state.name == null ? 
          <NameInput newNameCallback={this.newNameCallback} nameCallback={this.props.nameCallback}/>
          :
          <div className="main">
            <MessageList/>
            <ChatInput appendCallback={this.props.appendCallback} replaceCallback={this.props.replaceCallback}/>
          </div>
        }
      </div>
    );
  }
}

export default App;
