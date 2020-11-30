import './App.css';
import {eventHandler} from './index';
import React from 'react';
import * as data from './chatData';

interface MessageProps {
  name: string,
  maxLines: number,
  width: number
}

class Message extends React.Component<MessageProps, {text: string}> {
  static defaultProps = {maxLines: 4, width: 500};

  lines: Array<string> = [""];

  ref: React.RefObject<HTMLParagraphElement>;
  constructor(props: MessageProps) {
    super(props);
    this.state = {text: ""};

    this.appendText = this.appendText.bind(this);
    this.replaceText = this.replaceText.bind(this);

    this.ref = React.createRef();
  }

  componentDidMount() {
    //subscribe to update on name
    //TODO unregister these
    eventHandler.onAppend(this.props.name, this.appendText);
    eventHandler.onReplace(this.props.name, this.replaceText);
  }

  componentDidUpdate() {
    if(this.ref.current != null) {
      let rects = this.ref.current.getClientRects();
      let numLines = rects.length;

      //TODO make this less spaghetti
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
          this.setState({text: this.ref.current.textContent});
        }
      }
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

  getTextWidth(text: string, font: string) {
    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d")!;
    context.font = font;
    return context.measureText(text).width;
  }

  splitText(text: string) {
    let font = "";
    if(this.ref.current === null) {
      console.log("error getting font");
    }
    else {
      font = window.getComputedStyle(this.ref.current).font;
    }
    let width = this.getTextWidth(text, font);

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
            <span ref={this.ref}>
              {this.splitText(this.state.text)}
            </span>
          </p>
      </div>
    )
  }
}

interface MessagelistState {
  messages: Array<{name: string}>
}

class MessageList extends React.Component<{}, MessagelistState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      messages: []
    };

    this.addUser = this.addUser.bind(this);
    this.removeUser = this.removeUser.bind(this);
    //this.receivePacket = this.receivePacket.bind(this);
  }

  componentDidMount() {
    //TODO unregister these
    eventHandler.onAddUser(this.addUser);
    eventHandler.onDelUser(this.removeUser);
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

  render() {
    return <div className="message-list">
      {this.state.messages.map((message) => <Message key={message.name} name={message.name}/>)}
    </div>;
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

interface AppProps {
  appendCallback: (text: string) => void,
  replaceCallback: (text: string, offset: number) => void,
  //socket: WebSocket
  nameCallback: (name: string) => void
}

interface AppState {
  name: string | null
}

class App extends React.Component<AppProps, AppState> {

  constructor(props: AppProps) {
    super(props);

    this.state = {
      name: null
    }

    this.props.nameCallback("naim");

    this.newNameCallback = this.newNameCallback.bind(this);
  }

  newNameCallback(newName: string) {
    this.setState({name: newName});
  }

  render() {
    if(this.state.name == null) {
      return (
        <div className="App">
          <NameInput newNameCallback={this.newNameCallback} nameCallback={this.props.nameCallback}/>
        </div>
      )
    }
    else {
      return (
        <div className="App">
          <div className="sidebar">
            "asdf"
          </div>
          <div className="main">
            <MessageList/>
            <ChatInput appendCallback={this.props.appendCallback} replaceCallback={this.props.replaceCallback}/>
          </div>
        </div>
      );
    }
  }
}

/*
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
*/

export default App;
