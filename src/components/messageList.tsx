import {eventHandler} from '../index';
import React from 'react';
import {Message} from './message';

interface MessagelistState {
  messages: Array<{name: string, initialText?: string}>,
  roomName: string
}

export class MessageList extends React.Component<{}, MessagelistState> {

  onAddUserId = 0
  onRemoveUserId = 0
  onNewRoomId = 0

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
    eventHandler.onAddUser(this.addUser);
    eventHandler.onDelUser(this.removeUser);
    eventHandler.onNewRoom(this.newRoom);
  }

  componentWillUnmount() {
    eventHandler.unregister(this.onAddUserId);
    eventHandler.unregister(this.onRemoveUserId);
    eventHandler.unregister(this.onNewRoomId);
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
