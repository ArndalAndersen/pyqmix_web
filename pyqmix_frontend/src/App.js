import React, { Component } from 'react';
import { Button, ButtonGroup, FormGroup, Input, Label, Modal,
  ModalHeader, ModalBody, ModalFooter, Form} from 'reactstrap';
import logo from './snake.svg';
import './App.css';


class PumpForm extends Component {
  state = {
    connectedToPumps: false,  // Are the pumps connected?
    detectedPumps: [],  // Pumps detected in system
    selectedPumps: [],  // Pumps selected by user
    pumps: [],
    nbRep: 0,
    targetVolume: [],
    volumeUnit: "mL",
    flowRate: [],
    flowUnit: "mL/s",
    fillLevel: [],
    syringeSize: "",
    syringeVolume: "",
    isPumping: false,
    currentFillLevel: "",  // Instead, use the pump-object
    pumpNumber: "",
    modal: false,
    isPumpDetected: false,
  };

  // Update state by input-fields
  handleRepetitionsChange = (e) => this.setState({nbRep: e.target.value});
  handleTargetVolumeChange = (e) => this.setState({targetVolume: e.target.value});
  handleVolumeUnitChange = (e) => this.setState({volumeUnit: e.target.value});
  handleFlowRateChange = (e) => this.setState({flowRate: e.target.value});
  handleFlowUnitChange = (e) => this.setState({flowUnit: e.target.value});

  // Detect pumps and return a list of them
  handleDetectPumps = (e) => {
    this.setState({connectedToPumps: !this.state.connectedToPumps},
      async () => {
        let payload = {PumpInitiate: this.state.connectedToPumps };
        console.log(payload); //example from html script, not sure whether it would work here
        const response = await fetch('/api/pumps', {
          method: 'put',
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const json = await response.json();
        this.setState({detectedPumps: json});

        // Unselect pumps if they are disconnected, and get all pumps' state if connected
        if (this.state.connectedToPumps === false) {
          this.setState({selectedPumps: []})
        } else {
          this.getPumpStates();
        }

        // old method instead of the await method
        // response
        //   .then(r => {return r.json()})
        //   .then(json => this.setState({detectedPumps: json}));
      }
    );
  };

// Update state on which pumps the user selected
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
  toggle = (e) => {
    this.setState({modal: !this.state.modal})
  };

  waitForPumps = async () => {
     do {
        console.log('getting states');
        this.getPumpStates();
        console.log('taking a break');
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('back again!');
      } while (this.state.pumps.some(x => x.isPumping));
  };

// Refill pumps
  handleRefill = async (e) => {
    this.toggle(); // To remove the modal

    // Iterate over repetitions
    let repIndex;
    for (repIndex = 0; repIndex < this.state.nbRep; repIndex++ ) {

      // Start by emptying
      this.sendCommmandToPumps({
        'targetVolume': this.state.targetVolume,
        'volumeUnit': this.state.volumeUnit,
        'flowRate': this.state.flowRate,
        'flowUnit': this.state.flowUnit
      });

      await this.waitForPumps();

      // End by refilling
      this.sendCommmandToPumps({
        'targetVolume': this.state.targetVolume,
        'volumeUnit': this.state.volumeUnit,
        'flowRate': this.state.flowRate,
        'flowUnit': this.state.flowUnit
      });

      await this.waitForPumps();

    }
  };



  isStillPumping = (e) => {
    const response = fetch('/api/ispumping', {
      method: 'get',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
    });

    response
      .then(r => {return r.json()})
      .then(json => console.log(json))

  };

  sendCommmandToPumps = (payload) => {

    let pumpIndex;
    let pumpName;

    this.setState({isPumping: true});

    for (pumpIndex = 0; pumpIndex < this.state.selectedPumps.length; pumpIndex++) {

      pumpName = this.state.selectedPumps[pumpIndex];

      // Send information to pump-specific endpoint
      const promise = fetch('/api/pumps/'+pumpName.toString(), {
        method: 'put',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }
  };


  getPumpState = async (pumpName) => {
    const response = await fetch('/api/pumps/' + pumpName.toString(), {
      method: 'get',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
    });

    const json = await response.json();
    return json;
  };

  getPumpStates = async (e) => {

    const response = await fetch('/api/pumps', {
      method: 'get',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
    });

    const json = await response.json();
    console.log(json);
    this.setState({pumps: json})

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
          {/*<p>Selected: {JSON.stringify(thƒis.state.selectedPumps)}</p>*/}
        </div>

        <Form method="post"
              onSubmit={(e) => {
                e.preventDefault();
                this.toggle();
              }}>

          <FormGroup className="refill-form">

            <div className="refill-subform">
              <Button color="success"
                      disabled={this.state.selectedPumps.length === 0}
              > Refill </Button>
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
                {/*<option value={this.state.volumeUnit}>HEJ</option>*/}
                {/*<option value={this.state.volumeUnit}>{this.state.volumeUnit.toString()}</option>*/}
                <option value={this.state.volumeUnit}>{this.state.volumeUnit}</option>
                <option value="cL_form">cL</option>
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
                <option value={this.state.flowUnit}>{this.state.flowUnit}</option>
                <option value="mL/min">mL/min</option>
                <option value="cL/s">cL/s</option>
                <option value="cL/min">cL/min</option>
              </Input>
            </div>

          </FormGroup>
        </Form>
      </div>
    )
  }
}

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
