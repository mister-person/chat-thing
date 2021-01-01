import React from 'react';

interface ChatInputState {
  text: string,
  unsentText: string,
  unsentOffset: number
};

interface ChatInputProps {
  currentRoom: string | null,
  replaceCallback: (text: string, offset: number) => void,
}

export class ChatInput extends React.Component<ChatInputProps, ChatInputState> {
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

      //calculate what new text was added to or changed in the text box
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

      //update unsent text and offset with what just changed.
      //can't send a packet directly from here because apparently
      //setState shouldn't have side effects.
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
