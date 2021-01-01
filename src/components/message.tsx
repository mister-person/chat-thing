import {eventHandler} from '../index';
import React from 'react';

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

export class Message extends React.Component<MessageProps, MessageState> {
  static defaultProps = {maxLines: 4, width: 500, initialText: ""};

  onAppendId = 0
  onReplaceId = 0

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
    //TODO I should probably be passing these in somehow
    this.onAppendId = eventHandler.onAppend(this.props.name, this.appendText);
    this.onReplaceId = eventHandler.onReplace(this.props.name, this.replaceText);

    this.cutExtraLines(this.getLines());
  }

  componentWillUnmount() {
    eventHandler.unregister(this.onAppendId);
    eventHandler.unregister(this.onReplaceId);
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
              {this.fixNewline(this.state.text).split("").map((ch, i) => <span key={i}>{ch}</span>)}
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
              {this.fixNewline(this.state.text).split("").map((ch, i) => <span key={i}>{ch}</span>)}
            </span>
          </p>
      </div>
    )
  }
}
