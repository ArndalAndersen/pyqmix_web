import React, { Component } from 'react';
import { Button, ButtonGroup, FormGroup, Input, Label, Modal,
        ModalHeader, ModalBody, ModalFooter} from 'reactstrap';
import logo from './snake.svg';
import './App.css';


class PumpForm extends Component {
  state = {
    isPumpDetected: false,
    // availablePumps: pumpList,  //Comes from flask
    availablePumps: [0,1,2,3,4],
    pumpList: [],
    fillLevel: "",
    syringeSize: "",
    syringeVolume: "",
    isPumping: false,
    flowRate: "",
    targetVolume: "",
    flowUnit: "",
    volumeUnit: "",
    currentFillLevel: "",  // Instead, use the pump-object
    pumpNumber: "",
    modal: false
  };

  // If I want a separate function that detects pumps
  // But I actually just want to send a go-ahead signal and get a list in return. How do I do both?
  handleDetectPumps(e) {
   e.preventDefault();
   this.setState({ isPumpDetected: !this.state.isPumpDetected })
    var payload = {}
    console.log(payload)
    const response = fetch('/detect_pumps', {
      }
    )

    response
      .then(r => this.setState({availablePumps: r}))
  }

  handlePumpList = (selected) => {
    const index = this.state.pumpList.indexOf(selected);
    if (index < 0) {
      this.state.pumpList.push(selected);
    } else {
      this.state.pumpList.splice(index, 1);
    }
    this.setState({ pumpList: [...this.state.pumpList] });
  }

  handleRefill

  toggle = () => { this.setState({modal: !this.state.modal}) };

  render() {
    return (
      <div className="pump-form">

        <Button color="success" onClick={this.handleDetectPumps}> Detect pumps
        </Button>


        <h5>Select pumps</h5>
        <ButtonGroup>
          {this.state.availablePumps.map(pump_index =>
            <Button color="primary"
                    onClick={() => this.handlePumpList(pump_index)}
                    active={this.state.pumpList.includes(pump_index)}>
              {pump_index.toString()}
            </Button>
          )}
        </ButtonGroup>
        <p>Selected: {JSON.stringify(this.state.pumpList)}</p>

        <Button color="success" onClick={this.toggle}> Refill </Button>
        <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
          <ModalHeader toggle={this.toogle}>Refill</ModalHeader>
          <ModalBody>
            Have you remembered to:
            1) remove the spray head from the outlet?
            2) insert the inlet tube into the stimulus?
          </ModalBody>
          <ModalFooter>
            <Button color="success" onClick={this.toggle}> Continue </Button>{' '}
            <Button color="danger" onClick={this.toggle}> Cancel </Button>
          </ModalFooter>
        </Modal>
        <FormGroup className="form-group">
          <Label>Flow rate</Label>
          <Input type="number" name="targetVolume" min="0"
                   placeholder="Insert a number here."
                   onChange={this.handleTargetVolumeChange}
                   required/>
          <Input type="select" name="flowUnit"
                   onChange={this.handleFlowUnitChange}>
              <option value="mL/s">mL/s</option>
              <option value="mL/min">mL/min</option>
              <option value="cL/s">cL/s</option>
              <option value="cL/min">cL/min</option>
            </Input>
        </FormGroup>

      </div>
    )
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
        </p>
        <PumpForm/>
      </div>
    );
  }
}

export default App;
