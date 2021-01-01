import {eventHandler} from '../index';
import React from 'react';

type NameInputProps = {
  nameCallback: (name: string) => void,
  newNameCallback: (newName: string) => void
};

export class NameInput extends React.Component<NameInputProps, {message: string | null}> {
  inputRef: React.RefObject<HTMLInputElement>;
  disconnectCallback: NodeJS.Timeout | null = null;
  nameResponseID = 0;
  
  constructor(props: NameInputProps) {
    super(props);

    this.state = {message: null};

    this.inputRef = React.createRef();
    
    this.handleNameResponse = this.handleNameResponse.bind(this);
  }

  componentDidMount() {
    this.nameResponseID = eventHandler.onName(this.handleNameResponse);
  }

  componentWillUnmount() {
    eventHandler.unregister(this.nameResponseID);
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
