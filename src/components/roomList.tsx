import React from 'react';
import {eventHandler} from '../index';

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

export class RoomList extends React.Component<RoomListProps, RoomListState> {
  mouseOver = false;
  updatedRooms: Array<{name: string, usrcount: number}> | null = null;

  onRoomListID = 0;
  onNewRoomID = 0;

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
    this.onRoomListID = eventHandler.onRoomList(this.roomListCallback);
    this.onNewRoomID = eventHandler.onNewRoom(this.onJoinRoomSuccess);
    console.log("register", this.onRoomListID);
  }

  componentWillUnmount() {
    eventHandler.unregister(this.onRoomListID);
    eventHandler.unregister(this.onNewRoomID);
    console.log("unregister", this.onRoomListID);
  }

  roomListCallback(rooms: Array<{name: string, usrcount: number}>) {
    rooms.sort((room1, room2) => room2.usrcount - room1.usrcount);

    //only update the user count of rooms for now, not the order or the content
    //we don't want the rooms list to change while the mouse is over them
    if(this.mouseOver) {
      this.updatedRooms = rooms.slice();

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
