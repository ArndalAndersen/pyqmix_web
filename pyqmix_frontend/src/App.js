import React, { Component } from 'react';
import { Button, ButtonGroup, FormGroup, Input, Modal,
  ModalHeader, ModalBody, ModalFooter, Form} from 'reactstrap';
import logo from './snake.svg';
import './App.css';


class PumpForm extends Component {
  state = {
    connectedToPumps: false,  // Are the pumps connected?
    detectedPumps: [],  // Pumps detected in system
    selectedPumps: [],  // Pumps selected by user. Index of pumps in state.pumps.
    pumps: [],
    nbRep: 0,
    targetVolume: [],
    volumeUnit: "mL",
    flowRate: [],
    flowUnit: "mL/s",
    modal: false,
    modal_specific: {'refe': false, },
    minSyringeSize: ""
  };

  // Update state by input-fields
  handleRepetitionsChange = (e) => this.setState({nbRep: e.target.value});
  handleTargetVolumeChange = (e) => this.setState({targetVolume: e.target.value});
  handleVolumeUnitChange = (e) => this.setState({volumeUnit: e.target.value});
  handleFlowRateChange = (e) => this.setState({flowRate: e.target.value});
  handleFlowUnitChange = (e) => this.setState({flowUnit: e.target.value});


  // Toggle to remove the modal
  toggle = (e) => {this.setState({modal: !this.state.modal})};

  toggle_specific = (modalType) => {

    let modals;
    modals = this.state.modal_specific;
    modals[modalType] = !modals[modalType];
    this.setState({modal_specific: modals})

  };


  // Update state.selectedPumps based on which pumps the user selected
  handleSelectedPumpList = (selected) => {
    const index = this.state.selectedPumps.indexOf(selected);
    if (index < 0) {
      this.state.selectedPumps.push(selected);
    } else {
      this.state.selectedPumps.splice(index, 1);
    }
    this.setState({ selectedPumps: [...this.state.selectedPumps] }, this.minimum_syringe_volume);

  };

  // Detect pumps and return a list of them
  handleDetectPumps = (e) => {
    this.setState({connectedToPumps: !this.state.connectedToPumps},
      async () => {
        let payload = {pumpInitiate: this.state.connectedToPumps};
        console.log(payload); //example from html script, not sure whether it would work here
        const response = await fetch('/api/pumps', {
          method: 'put',
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        // Browse for config file and dll-folder if it was not already found
        const json = await response.json();
        if (response.ok) {
          this.setState({detectedPumps: json});
        }

        // Unselect pumps if they are disconnected, and get all pumps' state if connected
        if (this.state.connectedToPumps === false) {
          this.setState({selectedPumps: []})
        } else {
          this.getPumpStates();
        }
      }
    );
  };


  // Reference move
  handleReferenceMove = (e) => {
    this.toggle_specific('referenceMove'); // To remove the modal

    this.sendCommmandToPumps('referenceMove');

  };

  // Refill pumps
  handleFill = (e) => {
    this.toggle(); // To remove the modal

    // Set pumps to fill level
    this.sendCommmandToPumps('fillToLevel');

    // Iterate over repetitions
    let repIndex;
    for (repIndex = 1; repIndex < this.state.nbRep; repIndex++ ) {

      // Empty syringes
      this.sendCommmandToPumps('empty');

      // Set pumps to fill level
      this.sendCommmandToPumps('fillToLevel');

    }
  };


  // Bubble cycle
  handleBubbleCycle = (e) => {
    this.toggle(); // To remove the modal

    // Fill in air
    this.sendCommmandToPumps('fillToLevel');

    // Empty syringes
    this.sendCommmandToPumps('empty');

    // Fill in stimulus
    this.sendCommmandToPumps('fillToLevel');

  };


  // Rinse syringes
  handleRinse = (e) => {
    this.toggle(); // To remove the modal

    // Empty syringes
    this.sendCommmandToPumps('empty');

    // Iterate over repetitions
    let repIndex;
    for (repIndex = 1; repIndex < this.state.nbRep; repIndex++ ) {

      // Fill syringes
      this.sendCommmandToPumps('fill');

      // Empty syringes
      this.sendCommmandToPumps('empty');

    }
  };


  // Empty syringes
  handleEmpty = (e) => {
    this.toggle(); // To remove the modal

    // Empty syringes
    this.sendCommmandToPumps('empty');

    // Iterate over repetitions
    let repIndex;
    for (repIndex = 1; repIndex < this.state.nbRep; repIndex++ ) {

      // Set pumps to fill level
      this.sendCommmandToPumps('fill');

      // Empty syringes
      this.sendCommmandToPumps('empty');

    }
  };


  // Send pump command to backend
  sendCommmandToPumps = async (action) => {

    await this.waitForPumpingToFinish();

    let payload;
    for (let pumpName in this.state.selectedPumps) {

      payload = this.makePumpCommand(action, pumpName);

      // Send information to pump-specific endpoint
      fetch('/api/pumps/'+pumpName.toString(), {
        method: 'put',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }
  };

  // Translate action to pump commands
  makePumpCommand = (action, PumpName) => {

    let pumpCommand;
    let targetVolume;

    if (action === 'referenceMove') {
      pumpCommand = {action: action};
    } else if (action === 'fillToLevel' || action === 'fill' || action === 'empty') {

      // If the command is fillToLevel, empty, or fill
      if (action === 'fillToLevel') {
        targetVolume = this.state.targetVolume;
      } else if (action === 'empty') {
        targetVolume = 0;
      } else if (action === 'fill') {
        targetVolume = this.state.pumps[PumpName].syringe_volume
      }

      pumpCommand = {
        'action': action,
        'params': {
          'targetVolume': targetVolume,
          'volumeUnit': this.state.volumeUnit,
          'flowRate': this.state.flowRate,
          'flowUnit': this.state.flowUnit
        }
      };
    } else {console.log({})}
    return pumpCommand
  };



  waitForPumpingToFinish = async () => {
    do {
      console.log('Checking whether pumps are still pumping');
      this.getPumpStates();
      await new Promise(resolve => setTimeout(resolve, 3000));
    } while (this.state.pumps.some(x => x.isPumping));
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


//  This function is currently not used
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

  // Change so function is only used when it has
  minimum_syringe_volume = () => {

    if (this.state.selectedPumps.length > 0) {
      let selectedPumps = this.state.pumps.filter( (e) => this.state.selectedPumps.includes(e.index) );
      let pumpWithMinSyringeSize = selectedPumps.sort((x, y) => y.syringe_volume - x.syringe_volume).pop();
      let minSyringeSize = pumpWithMinSyringeSize.syringe_volume;
      console.log(minSyringeSize);
      this.setState({minSyringeSize: minSyringeSize.toString()})
    } else {this.setState({minSyringeSize: "300"})}

  };


  render = () => {
    return (

      <div className="pump-form">

        <div className="button-group">
          <Button
            color={this.state.connectedToPumps ? "success" : "success"}
            onClick={this.handleDetectPumps}>
            {this.state.connectedToPumps ? "Disconnect pumps" : "Detect pumps"}
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

        <div className="entire-input-form">

          {/*REFERENCE MOVE*/}
          <Form method="post"
                onSubmit={(e) => {
                  e.preventDefault();
                  this.toggle_specific('referenceMove');
                }}>

            <FormGroup className="input-form">

              <div className="row">
                <div className="col-sm-3 input-subform button-subform">
                  <Button color="success"
                          disabled={this.state.selectedPumps.length === 0}
                  > Reference Move </Button>
                  <Modal isOpen={this.state.modal_specific['referenceMove']} toggle={function() { return this.toggle_specific('referenceMove');} } className={this.props.className}>
                    <ModalHeader toggle={() => this.toggle_specific('referenceMove')}>Reference Move</ModalHeader>
                    <ModalBody>
                      Detach all syringes from the pumps before continuing.
                    </ModalBody>
                    <ModalFooter>
                      <Button color="success" onClick={this.handleReferenceMove}> Continue </Button>
                      <Button color="danger" onClick={() => this.toggle_specific('referenceMove')}> Cancel </Button>
                    </ModalFooter>
                  </Modal>
                </div>
                <div className="col-sm-3"></div>
                <div className="col-sm-3"></div>
                <div className="col-sm-3"></div>
              </div>
            </FormGroup>
          </Form>


          {/*FILL FORM*/}
          <Form method="post"
                onSubmit={(e) => {
                  e.preventDefault();
                  this.toggle();
                }}>

            <FormGroup className="input-form">
              <div className="row">

                <div className="col-sm-3 input-subform button-subform">
                  <Button color="success"
                          disabled={this.state.selectedPumps.length === 0}
                  > Fill </Button>
                  <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
                    <ModalHeader toggle={this.toogle}>Refill</ModalHeader>
                    <ModalBody>
                      Have you remembered to:
                      1) remove the spray head from the outlet?
                      2) insert the inlet tube into the stimulus?
                    </ModalBody>
                    <ModalFooter>
                      <Button color="success" onClick={this.handleFill}> Continue </Button>
                      <Button color="danger" onClick={this.toggle}> Cancel </Button>
                    </ModalFooter>
                  </Modal>
                </div>


                <div className="col-sm-3 input-subform nrep-subform">
                  <Input type="number"
                         name="nbRepetitions"
                         min="1"
                         placeholder="No. of repetitions."
                         onChange={this.handleRepetitionsChange}
                         required/>
                </div>


                <div className="col-sm-3 input-subform volume-subform">
                  <Input type="number"
                         name="targetVolume"
                         min="0"
                         max={this.state.minSyringeSize}
                         placeholder="Target volume."
                         onChange={this.handleTargetVolumeChange}
                         required/>
                  <Input type="select"
                         name="flowUnit"
                         onChange={this.handleVolumeUnitChange}>
                    <option value={this.state.volumeUnit}>{this.state.volumeUnit}</option>
                    <option value="cL_form">cL</option>
                  </Input>
                </div>


                <div className="col-sm-3 input-subform flowrate-subform">
                  <Input type="number"
                         name="flowRate"
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
              </div>
            </FormGroup>

          </Form>


          {/*BUBBLE CYCLE FORM*/}
          <Form method="post"
                onSubmit={(e) => {
                  e.preventDefault();
                  this.toggle();
                }}>

            <FormGroup className="input-form">
              <div className="row">

                <div className="col-sm-3 input-subform button-subform">
                  <Button color="success"
                          disabled={this.state.selectedPumps.length === 0}
                  > Bubble Cycle </Button>
                  <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
                    <ModalHeader toggle={this.toogle}>Bubble Cycle</ModalHeader>
                    <ModalBody>
                      Have you remembered to:
                      1) remove the spray head from the outlet?
                      2) insert the inlet tube into the stimulus?
                    </ModalBody>
                    <ModalFooter>
                      <Button color="success" onClick={this.handleBubbleCycle}> Continue </Button>
                      <Button color="danger" onClick={this.toggle}> Cancel </Button>
                    </ModalFooter>
                  </Modal>
                </div>


                <div className="col-sm-3 input-subform nrep-subform"></div>


                <div className="col-sm-3 input-subform volume-subform">
                  <Input type="number"
                         name="targetVolume"
                         min="0"
                         placeholder="Target volume."
                         onChange={this.handleTargetVolumeChange}
                         required/>
                  <Input type="select"
                         name="flowUnit"
                         onChange={this.handleVolumeUnitChange}>
                    <option value={this.state.volumeUnit}>{this.state.volumeUnit}</option>
                    <option value="cL_form">cL</option>
                  </Input>
                </div>


                <div className="col-sm-3 input-subform flowrate-subform">
                  <Input type="number"
                         name="flowRate"
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
              </div>
            </FormGroup>

          </Form>



          {/*RINSE FORM*/}
          <Form method="post"
                onSubmit={(e) => {
                  e.preventDefault();
                  this.toggle();
                }}>

            <FormGroup className="input-form">
              <div className="row">

                <div className="col-sm-3 input-subform button-subform">
                  <Button color="success"
                          disabled={this.state.selectedPumps.length === 0}
                  > Rinse </Button>
                  <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
                    <ModalHeader toggle={this.toogle}>Rinse</ModalHeader>
                    <ModalBody>
                      Have you remembered to:
                      1) remove the spray head from the outlet?
                      2) insert the inlet tube into the stimulus?
                    </ModalBody>
                    <ModalFooter>
                      <Button color="success" onClick={this.handleRinse}> Continue </Button>
                      <Button color="danger" onClick={this.toggle}> Cancel </Button>
                    </ModalFooter>
                  </Modal>
                </div>


                <div className="col-sm-3 input-subform nrep-subform">
                  <Input type="number"
                         name="nbRepetitions"
                         min="1"
                         placeholder="No. of repetitions."
                         onChange={this.handleRepetitionsChange}
                         required/>
                </div>


                <div className="col-sm-3 input-subform volume-subform"></div>


                <div className="col-sm-3 input-subform flowrate-subform">
                  <Input type="number"
                         name="flowRate"
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
              </div>
            </FormGroup>

          </Form>


          {/*EMPTY FORM*/}
          <Form method="post"
                onSubmit={(e) => {
                  e.preventDefault();
                  this.toggle();
                }}>

            <FormGroup className="input-form">
              <div className="row">

                <div className="col-sm-3 input-subform button-subform">
                  <Button color="success"
                          disabled={this.state.selectedPumps.length === 0}
                  > Empty </Button>
                  <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
                    <ModalHeader toggle={this.toogle}>Empty</ModalHeader>
                    <ModalBody>
                      Have you remembered to:
                      1) remove the spray head from the outlet?
                      2) insert the inlet tube into the stimulus?
                    </ModalBody>
                    <ModalFooter>
                      <Button color="success" onClick={this.handleEmpty}> Continue </Button>
                      <Button color="danger" onClick={this.toggle}> Cancel </Button>
                    </ModalFooter>
                  </Modal>
                </div>


                <div className="col-sm-3 input-subform nrep-subform">
                  <Input type="number"
                         name="nbRepetitions"
                         min="1"
                         placeholder="No. of repetitions."
                         onChange={this.handleRepetitionsChange}
                         required/>
                </div>


                <div className="col-sm-3 input-subform volume-subform"></div>


                <div className="col-sm-3 input-subform flowrate-subform">
                  <Input type="number"
                         name="flowRate"
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
              </div>
            </FormGroup>

          </Form>

        </div>

      </div>
    )
  }
}


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
