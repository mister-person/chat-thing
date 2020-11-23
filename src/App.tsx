import './App.css';
import {eventHandler} from './index';
import React from 'react';
import * as data from './chatData';

class Message extends React.Component<{name: string}, {text: string}> {
  constructor(props: {name: string}) {
    super(props);
    this.state = {text: ""};

    this.appendText = this.appendText.bind(this);
    this.replaceText = this.replaceText.bind(this);
  }

  componentDidMount() {
    //subscribe to update on name
    //TODO unregister these
    eventHandler.onAppend(this.props.name, this.appendText);
    eventHandler.onReplace(this.props.name, this.replaceText);
  }

  appendText(text: string) {
    console.log("adding text " + text);
    this.replaceText(text, 0);
  }

  replaceText(text: string, offset: number) {
    this.setState((oldState, _props) => {
      //TODO magic number
      //can't use negative slice index because would be wrong for offset = 0
      console.log(text);
      let newText = oldState.text.slice(0, oldState.text.length - offset) + text;
      return {text: newText.slice(-50)};
    });
  }

  render() {
    return (
      <>
        <div>
          {this.props.name}
        </div>
        <div>
          {this.state.text === "" ? <br/> : this.state.text}
        </div>
      </>
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
    return this.state.messages.map((message) => <Message key={message.name} name={message.name}/>);
  }
}

//TODO specify type of props
class ChatInput extends React.Component<any, {text: string}> {
  constructor(props: any) {
    super(props);
    
    this.state = {text: ""}

    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    this.setState((oldState, _props) => {
      let oldText = oldState.text;
      let newText = event.target.value;

      {
        let offset = oldText.length;
        for(let i = 0; i < newText.length; i++) {
          //if newText[i] overflows, it is undefined,
          //which exits the loop with offset 0 as it should
          if(newText[i] !== oldText[i]) {
            break
          }
          offset--;
        }
        var textToAppend = newText.slice(oldText.length - offset);
        this.props.replaceCallback(textToAppend, offset);
      }

      //TODO magic number
      return {text: newText.slice(-10)}
    });
  }

  render() {
    return (
      <input type="text" value={this.state.text} onChange={this.handleChange}>
          
      </input>
    )
  }
}

type NameInputProps = {socket: WebSocket, newNameCallback: (newName: string) => void};

class NameInput extends React.Component<NameInputProps, {message: string | null}> {
  inputRef: React.RefObject<HTMLInputElement>;
  
  constructor(props: NameInputProps) {
    super(props);

    this.state = {message: null};

    this.inputRef = React.createRef();
    
    this.handleNameResponse = this.handleNameResponse.bind(this);
  }

  componentWillMount() {
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
      let request: data.ClientMessageRequestName = {
        type: "name",
        name: this.inputRef.current.value
      };
      this.props.socket.send(JSON.stringify(request));
    }
  }

  render() {
    return (
      <form>
        <input type="text" ref={this.inputRef}>
          
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
  socket: WebSocket
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

    this.newNameCallback = this.newNameCallback.bind(this);
  }

  newNameCallback(newName: string) {
    this.setState({name: newName});
  }

  render() {
    if(this.state.name == null) {
      return (
        <div className="App">
          <NameInput newNameCallback={this.newNameCallback} socket={this.props.socket}/>
        </div>
      )
    }
    else {
      return (
        <div className="App">
          <MessageList/>
          <ChatInput appendCallback={this.props.appendCallback} replaceCallback={this.props.replaceCallback}/>
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
