import React, { Component } from 'react';
import logo from './snake.svg';
import './App.css';


class PumpForm extends Component {
  state = {
    fillLevel: "",
    syringeSize: "",
    syringeVolume: "",
    isPumping: false,
    flowRate: "",
    targetVolume: "",
    flowUnit: "",
    volumeUnit: "",
    currentFillLevel: "",  // Instead, use the pump-object
    pumpNumber: ""
  }


};






// Here I put the stuff on the webpage
class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to Miami!</h1>
        </header>
        <p className="App-intro">
          Party in the city where the heat is on
        </p>
      </div>
    );
  }
}



export default App;
