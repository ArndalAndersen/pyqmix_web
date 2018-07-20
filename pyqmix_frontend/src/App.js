import React, { Component } from 'react';
import { Button, ButtonGroup, FormGroup, Input, Label, Modal,
  ModalHeader, ModalBody, ModalFooter} from 'reactstrap';
import logo from './snake.svg';
import './App.css';


class PumpForm extends Component {
  state = {
    connectedToPumps: false,  // Are the pumps connected?
    detectedPumps: [],  // Pumps detected in system
    selectedPumps: [],  // Pumps selected by user
    targetVolume: "",
    fillLevel: "",
    syringeSize: "",
    syringeVolume: "",
    isPumping: false,
    flowRate: "",
    flowUnit: "",
    volumeUnit: "",
    currentFillLevel: "",  // Instead, use the pump-object
    pumpNumber: "",
    modal: false,
    isPumpDetected: false,
  };

  // Update state with targetvolume
  handleFlowRateChange = (e) => this.setState({flowRate: e.target.value});
  handleTargetVolumeChange = (e) => this.setState({targetVolume: e.target.value});
  handleFlowUnitChange = (e) => this.setState({flowUnit: e.target.value});
  handleVolumeUnitChange = (e) => this.setState({volumeUnit: e.target.value});

  // Detect pumps and return a list of them
  handleDetectPumps = (e) => {

    let payload = { initiate: !this.state.connectedToPumps };
    console.log(payload); //example from html script, not sure whether it would work here
    const response = fetch('/api/pumps', {
      method: 'put',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    response
      .then(r => {return r.json()})
      .then(json => this.setState({detectedPumps: json}));

    // Since setState is asynchronous it does not work to run it at the top of this script
    this.setState({connectedToPumps: !this.state.connectedToPumps});
  };


  sendCommmandToPumps = (payload) => {

    let pumpIndex;
    let pumpName;

    for (pumpIndex = 0; pumpIndex < this.state.selectedPumps.length; pumpIndex++) {
      pumpName = this.state.selectedPumps[pumpIndex];

      // Send information to pump-specific endpoint
      const promise = fetch('/api/pumps/'+pumpIndex.toString(), {
        method: 'put',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }
  };


  // Update state with pumps selected to pump
  handleSelectedPumpList = (selected) => {
    const index = this.state.selectedPumps.indexOf(selected);
    if (index < 0) {
      this.state.selectedPumps.push(selected);
    } else {
      this.state.selectedPumps.splice(index, 1);
    }
    this.setState({ selectedPumps: [...this.state.selectedPumps] });
  };

  // Toggle to remove the modal
  toggle = () => { this.setState({modal: !this.state.modal}) };

  // Refill pumps
  handleRefill = (e) => {

    this.toggle(); // To remove the modal

    // Get volume etc. from the input fields / state. I define it here for test-purposes.
    const payload = {nbRep: 2, volume: 10};

    // Iterate over repetitions
    let repIndex;
    for (repIndex = 0; repIndex < payload['nbRep']; repIndex++ ) {

      // Start by emptying
      this.sendCommmandToPumps(payload);

      // End by refilling
      this.sendCommmandToPumps(payload);
    }
  };

  render = () => {
    return (
      <div className="pump-form">

        <div className="button-group">
          <Button
            color={this.state.connectedToPumps ? "success" : "success"}
            onClick={this.handleDetectPumps}>
            {this.state.connectedToPumps ? "Press to disconnect pumps" : "Detect pumps"}
          </Button>
        </div>

        <div className="button-group">
        <ButtonGroup>
          {this.state.detectedPumps.map(pump_index =>
            <Button color={"primary"}
                    key={pump_index}
                    onClick={() => this.handleSelectedPumpList(pump_index)}
                    active={this.state.selectedPumps.includes(pump_index)}>
              {'Pump ' + pump_index.toString()}
            </Button>
          )}
        </ButtonGroup>
        {/*<p>Selected: {JSON.stringify(this.state.selectedPumps)}</p>*/}
        </div>

        <FormGroup className="refill-form">

          <div className="refill-subform">
            <Button color="success" onClick={this.toggle}> Refill </Button>
            <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
              <ModalHeader toggle={this.toogle}>Refill</ModalHeader>
              <ModalBody>
                Have you remembered to:
                1) remove the spray head from the outlet?
                2) insert the inlet tube into the stimulus?
              </ModalBody>
              <ModalFooter>
                <Button color="success" onClick={this.handleRefill}> Continue </Button>
                <Button color="danger" onClick={this.toggle}> Cancel </Button>
              </ModalFooter>
            </Modal>
          </div>
          <div className="refill-subform">
            <Input type="number"
                   name="targetVolume"
                   min="1"
                   placeholder="No. of repetitions."
                   onChange={this.handleRepetitionsChange}
                   required/>
          </div>

          <div className="refill-subform">
            <Input type="number"
                   name="targetVolume"
                   min="0"
                   placeholder="Target volume."
                   onChange={this.handleTargetVolumeChange}
                   required/>
            <Input type="select"
                   name="flowUnit"
                   onChange={this.handleVolumeUnitChange}>
              <option value="mL/s">mL/s</option>
              <option value="mL/min">mL/min</option>
              <option value="cL/s">cL/s</option>
              <option value="cL/min">cL/min</option>
            </Input>
          </div>

          <div className="refill-subform">
            <Input type="number"
                   name="targetVolume"
                   min="0"
                   placeholder="Flow rate."
                   onChange={this.handleFlowRateChange}
                   required/>
            <Input type="select"
                   name="flowUnit"
                   onChange={this.handleFlowUnitChange}>
              <option value="mL/s">mL/s</option>
              <option value="mL/min">mL/min</option>
              <option value="cL/s">cL/s</option>
              <option value="cL/min">cL/min</option>
            </Input>
          </div>

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
