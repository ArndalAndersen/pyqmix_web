import React, { Component } from 'react';
import { Button, ButtonGroup, FormGroup, Input, Modal,
  ModalHeader, ModalBody, ModalFooter, Form, Label, FormText} from 'reactstrap';
import logo from './snake.svg';
import './App.css';


class PumpForm extends Component {
  state = {
    connectedToPumps: false,  // Are the pumps connected?
    detectedPumps: [],  // Pumps detected in system
    selectedPumps: [],  // Pumps selected by user. Index of pumps in state.pumps.
    isPumpConfigSetUp: false,
    pumps: [],
    nbRep: 0,
    targetVolume: [],
    volumeUnit: "mL",
    flowRate: [],
    flowUnit: "mL/s",
    modal: {
      'referenceMove': false,
      'fill': false,
      'bubbleCycleStart': false,
      'rinse': false,
      'empty': false,
      'bubbleCycleEnd': false,
      'locateConfigFiles': false
    },
    minSyringeSize: "",
    dllFileLocation: "",
    configFileLocation: ""
  };

  // Update state by input-fields
  handleRepetitionsChange = (e) => this.setState({nbRep: e.target.value});
  handleTargetVolumeChange = (e) => this.setState({targetVolume: e.target.value});
  handleVolumeUnitChange = (e) => this.setState({volumeUnit: e.target.value});
  handleFlowRateChange = (e) => this.setState({flowRate: e.target.value});
  handleFlowUnitChange = (e) => this.setState({flowUnit: e.target.value});
  handledllFileLocationChange = (e) => this.setState({dllFileLocation: e.target.value});
  handleconfigFileLocationChange = (e) => this.setState({configFileLocation: e.target.value});


  toggle = (modalType) => {

    let modals = this.state.modal;
    modals[modalType] = !modals[modalType];
    this.setState({modal: modals})

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


  handleConfigFiles = async (e) => {

    // Ask backend whether the pump configuration is set up
    if (this.state.isPumpConfigSetUp === false) {
      await this.getPumpStates()
    }

    console.log('Is Pump config set up?')
    console.log(this.state.isPumpConfigSetUp)

    // User must set up the pump configuration if it was not set up in the backend
    if (this.state.isPumpConfigSetUp === false && this.state.connectedToPumps === false) {

      this.toggle('locateConfigFiles');

      await this.waitForConfigFilesToBeSet();

      // Send the files to the backend
      let payload;
      payload = {'dllDir': this.state.dllFileLocation,
        'configDir': this.state.configFileLocation};
      const response = await fetch('/api/config', {
        method: 'put',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Could I potentially get a response which shows that the file paths were correct?
      // await response.json()

    }
    this.handleConnectPumps();
  };

  waitForConfigFilesToBeSet = async () => {
    do {
      await new Promise(resolve => setTimeout(resolve, 200));
    } while (this.state.isPumpConfigSetUp === false);
  };

  handleLocatingConfig = () => {
    this.toggle('locateConfigFiles');

    this.setState({isPumpConfigSetUp: !this.state.isPumpConfigSetUp})
  };

  // Detect pumps and return a list of them
  handleConnectPumps = (e) => {

    this.setState({connectedToPumps: !this.state.connectedToPumps},
      async () => {
        let payload = {pumpInitiate: this.state.connectedToPumps};
        console.log('Connect to pumps:');
        console.log(payload);

        const response = await fetch('/api/pumps', {
          method: 'put',
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        // Update state with the detected pumps
        const json = await response.json();
        this.setState({detectedPumps: json});

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

    // To remove the modal
    this.toggle('referenceMove');

    this.sendCommmandToPumps('referenceMove');

  };

  // Refill pumps
  handleFill = (e) => {

    // To remove the modal
    this.toggle('fill');

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
  handleBubbleCycleStart = async (e) => {

    // To remove the modal
    this.toggle('bubbleCycleStart');

    // Fill in air
    this.sendCommmandToPumps('fillToLevel');

    // Empty syringes
    this.sendCommmandToPumps('empty');

    await this.waitForPumpingToFinish();
    this.toggle('bubbleCycleEnd');

  };

  handleBubbleCycleEnd = (e) => {
    this.toggle('bubbleCycleEnd');

    // Fill in stimulus
    this.sendCommmandToPumps('fillToLevel');
  };

  // Rinse syringes
  handleRinse = (e) => {

    // To remove the modal
    this.toggle('rinse');

    // Iterate over repetitions
    let repIndex;
    for (repIndex = 0; repIndex < this.state.nbRep; repIndex++ ) {

      // Empty syringes
      this.sendCommmandToPumps('empty');

      // Fill syringes
      this.sendCommmandToPumps('fill');

      // Empty syringes
      this.sendCommmandToPumps('empty');

    }
  };


  // Empty syringes
  handleEmpty = (e) => {

    // To remove the modal
    this.toggle('empty');

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
    this.setState({pumps: json['pump_states']});
    this.setState({isPumpConfigSetUp: json['config_setup']});

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
            color="success"
            onClick={this.handleConfigFiles}>
            {this.state.connectedToPumps ? "Disconnect pumps" : "Detect pumps"}
          </Button>


          <Modal isOpen={this.state.modal['locateConfigFiles']} className={this.props.className}>
            <ModalHeader>Browse for files</ModalHeader>
            {/*<ModalBody></ModalBody>*/}
            <ModalHeader>
              <Form method="post"
                    onSubmit={(e) => {
                      e.preventDefault();
                    }}>
                <FormGroup>
                  <Label for="exampleText">dll directory</Label>
                  <FormText color="muted">
                    For example:
                    C:/Users/username/AppData/Local/QmixSDK
                  </FormText>
                  <Input
                    onChange={this.handleconfigFileLocationChange}
                    placeholder="C:/Users/Public/Documents/QmixElements/Projects/default_project/Configurations/my_own_config"
                    type="search"
                    name="text"
                    required
                    id="exampleText" />
                </FormGroup>

                <FormGroup>
                  <Label for="exampleText">config directory</Label>
                  <FormText color="muted">
                    For example:
                    C:/Users/Public/Documents/QmixElements/Projects/default_project/Configurations/my_own_config
                  </FormText>
                  <Input
                    onChange={this.handledllFileLocationChange}
                    placeholder="C:/Users/au278141/AppData/Local/QmixSDK"
                    type="textarea"
                    name="text"
                    id="exampleText" />
                </FormGroup>
              </Form>

            </ModalHeader>
            <ModalFooter>
              <Button color="success" onClick={this.handleLocatingConfig}> Continue </Button>
              <Button color="danger" onClick={() => this.toggle('locateConfigFiles')}> Cancel </Button>
            </ModalFooter>
          </Modal>


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
                  this.toggle('referenceMove');
                }}>

            <FormGroup className="input-form">

              <div className="row">
                <div className="col-sm-3 input-subform button-subform">
                  <Button color="success"
                          disabled={this.state.selectedPumps.length === 0}
                  > Reference Move </Button>
                  <Modal isOpen={this.state.modal['referenceMove']} className={this.props.className}>
                    <ModalHeader >Reference Move</ModalHeader>
                    <ModalBody>
                      Detach all syringes from the pumps before continuing.
                    </ModalBody>
                    <ModalFooter>
                      <Button color="success" onClick={this.handleReferenceMove}> Continue </Button>
                      <Button color="danger" onClick={() => this.toggle('referenceMove')}> Cancel </Button>
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
                  this.toggle('fill');
                }}>

            <FormGroup className="input-form">
              <div className="row">

                <div className="col-sm-3 input-subform button-subform">
                  <Button color="success"
                          disabled={this.state.selectedPumps.length === 0}
                  > Fill </Button>
                  <Modal isOpen={this.state.modal['fill']} className={this.props.className}>
                    <ModalHeader>Refill</ModalHeader>
                    <ModalBody>
                      Have you remembered to:
                      1) Empty the syringe first?
                      2) Insert the inlet tube into the stimulus?
                      3) Remove the spray head from the outlet?
                    </ModalBody>
                    <ModalFooter>
                      <Button color="success" onClick={this.handleFill}> Continue </Button>
                      <Button color="danger" onClick={() => this.toggle('fill')}> Cancel </Button>
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


          {/*EMPTY FORM*/}
          <Form method="post"
                onSubmit={(e) => {
                  e.preventDefault();
                  this.toggle('empty');
                }}>

            <FormGroup className="input-form">
              <div className="row">

                <div className="col-sm-3 input-subform button-subform">
                  <Button color="success"
                          disabled={this.state.selectedPumps.length === 0}
                  > Empty </Button>
                  <Modal isOpen={this.state.modal['empty']} className={this.props.className}>
                    <ModalHeader>Empty</ModalHeader>
                    <ModalBody>
                      Have you remembered to:
                      1) remove the spray head from the outlet?
                      2) remove the inlet tube from the stimulus reservoir?
                    </ModalBody>
                    <ModalFooter>
                      <Button color="success" onClick={this.handleEmpty}> Continue </Button>
                      <Button color="danger" onClick={() => this.toggle('empty')}> Cancel </Button>
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

          {/*BUBBLE CYCLE FORM*/}
          <Form method="post"
                onSubmit={(e) => {
                  e.preventDefault();
                  this.toggle('bubbleCycleStart');
                }}>

            <FormGroup className="input-form">
              <div className="row">

                <div className="col-sm-3 input-subform button-subform">
                  <Button color="success"
                          disabled={this.state.selectedPumps.length === 0}
                  > Bubble Cycle </Button>
                  <Modal isOpen={this.state.modal['bubbleCycleStart']} className={this.props.className}>
                    <ModalHeader>Bubble Cycle</ModalHeader>
                    <ModalBody>
                      Remove the inlet tube from the stimulus reservoir to aspirate air.
                    </ModalBody>
                    <ModalFooter>
                      <Button color="success" onClick={this.handleBubbleCycleStart}> Continue </Button>
                      <Button color="danger" onClick={() => this.toggle('bubbleCycleStart')}> Cancel </Button>
                    </ModalFooter>
                  </Modal>
                  <Modal isOpen={this.state.modal['bubbleCycleEnd']} className={this.props.className}>
                    <ModalHeader>Bubble Cycle</ModalHeader>
                    <ModalBody>
                      Insert to tube inlet into the stimulus reservoir to aspirate stimulus.
                    </ModalBody>
                    <ModalFooter>
                      <Button color="success" onClick={this.handleBubbleCycleEnd}> Continue </Button>
                      <Button color="danger" onClick={() => this.toggle('bubbleCycleEnd')}> Cancel </Button>
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
                  this.toggle('rinse');
                }}>

            <FormGroup className="input-form">
              <div className="row">

                <div className="col-sm-3 input-subform button-subform">
                  <Button color="success"
                          disabled={this.state.selectedPumps.length === 0}
                  > Rinse </Button>
                  <Modal isOpen={this.state.modal['rinse']} className={this.props.className}>
                    <ModalHeader>Rinse</ModalHeader>
                    <ModalBody>
                      Have you remembered to:
                      1) remove the spray head from the outlet?
                      2) insert the inlet tube into the rinsing fluid?
                    </ModalBody>
                    <ModalFooter>
                      <Button color="success" onClick={this.handleRinse}> Continue </Button>
                      <Button color="danger" onClick={() => this.toggle('rinse')}> Cancel </Button>
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
