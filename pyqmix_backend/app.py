from flask import Flask, request
from flask_restplus import Api, Resource
from flask_restplus.fields import Float, Boolean, String, Nested
from pyqmix import QmixBus, config, QmixPump
import os.path as op

app = Flask(__name__)
api = Api(app)

session_paramters = {
    'bus': None,
    'pumps': {}, #  Dictionary of pump objects
    'get_pumps_states_call_count': 0}

## --- Choose session type --- ##
app.config.from_object(__name__)
app.config['test_session'] = True
app.secret_key = 'secret_key'

## --- Flask-RESTPlus models --- ##
pump_client_request = api.model('Pumping request', {
    'targetVolume': Float(description='Target volume',
                        required=True,
                        example=5.0),
    'volumeUnit': String(description='Volume unit',
                        required=True,
                        example='mL'),
    'flowRate': Float(description='Flow rate',
                       required=True,
                       example=0.25),
    'flowUnit': String(description='Flow unit',
                      required=True,
                      example='mL/s')})

pump_client_request_nested = api.model('Pump request', {
    'action': String(description='action',
                        required=True,
                        example='referenceMove'),
    'params': Nested(pump_client_request)})

initiate_pumps_request = api.model('Initiate pumps', {
    'PumpInitiate': Boolean(desription='Initiate pumps',
                        required=True,
                        example=True)})


## --- Endpoints --- ##

@api.route('/api/')
class Main(Resource):
    pass

@api.route('/api/pumps')
class InitiatePumps(Resource):

    def get(self):
        session_paramters['get_pumps_states_call_count'] +=1
        pump_states = []
        for pump_id in session_paramters['pumps']:
            pump_state = get_pump_state(pump_id)
            pump_states.append(pump_state)

        return pump_states

    @api.expect(initiate_pumps_request)
    def put(self):  # Post: client posts info
        payload = request.json
        initiate_pumps = payload['pumpInitiate']
        print(payload)  # Goes to python console

        if initiate_pumps:
            detect_and_find_availablePumps()
        else:
            disconnect_pumps()

        available_pumps = list(session_paramters['pumps'].keys())

        return available_pumps


@api.route('/api/pumps/<int:pump_id>')
class Pumps(Resource):
    def get(self, pump_id):

        pump_status = get_pump_state(pump_id)

        return pump_status

    @api.expect(pump_client_request_nested)
    def put(self, pump_id):
        payload = request.json
        action = payload['action']

        if action == 'referenceMove':
            pump_reference_move(pump_id)
        elif action == 'empty' or action == 'fill' or action == 'fillToLevel':
            target_volume = session_paramters['pumps'][pump_id]
            volume_unit = payload['params']['volumeUnit']
            flow_rate = payload['params']['flowRate']
            flow_unit = payload['params']['flowUnit']

            # Initiate pump command
            pump_set_fill_level(pump_id=pump_id, target_volume=target_volume, volume_unit=volume_unit, flow_rate=flow_rate, flow_unit=flow_unit)

        return 201

## --- Functions --- ##

def detect_and_find_availablePumps():

    if app.config['test_session']:
        available_pumps = list(range(0, 5))
        pump_objects = list(range(0, 5))
        session_paramters['bus'] = 'I am a Qmix Bus.'
    # else:
        # # if not config.read_config()['qmix_dll_dir'] or not config.read_config()['qmix_config_dir']:
        #
        #     # Initialize connection to the pump system.
        #     config_dir = op.normpath(
        #         'C:/Users/Public/Documents/QmixElements/Projects/default_project/Configurations/one_pump')
        #     dll_dir = op.normpath('C:/Users/au278141/AppData/Local/QmixSDK')
        #
        #     config.set_qmix_config_dir(config_dir)
        #     config.set_qmix_dll_dir(dll_dir)
        # # else:
        #     session_paramters['bus'] = QmixBus()
        #     nb_pumps = QmixPump(index=0).n_pumps
        #     available_pumps = [str(i) for i in range(0,nb_pumps)]
        #     pump_objects = [QmixPump(index=pump_index) for pump_index in range(0, nb_pumps)]

    # Dict from zip
    session_paramters['pumps'] = dict(zip(available_pumps, pump_objects))

def disconnect_pumps():

    if not app.config['test_session']:
        bus = session_paramters['bus']
        bus.close()

    print(f'Bus before "closing": {session_paramters["bus"]}')
    session_paramters['bus'] = None
    print(f'Bus after "closing": {session_paramters["bus"]}')

    session_paramters['pumps'] = {}

def get_pump_state(pump_id):

    pump = session_paramters['pumps'][pump_id]

    if app.config['test_session']:
        pump_status = {
            'index': pump_id,
            'isPumping': session_paramters['get_pumps_states_call_count'] % 5 != 0,
            'fill_level': 20,
            'volume_unit': 'mL',
            'name': 'Midpressure 3',
            'syringe_volume': 25,
            'syringe_volume_unit': 'mL'}

    else:
        pump_status = {
            'index': pump_id,
            'is_pumping': pump.ispumping,
            'fill_level': pump.fill_level,
            'volume_unit': pump.volume_unit,
            'name': pump.name}

    return pump_status

def pump_set_fill_level(pump_id, target_volume, volume_unit, flow_rate, flow_unit):

    if app.config['test_session']:
        print(f'Starting virtual pump: {pump_id} and setting '
              f'target_volume to {target_volume} {volume_unit} '
              f'at {flow_rate} {flow_unit}')
    else:
        session_paramters['pumps'][str(pump_id)].set_fill_level()  # Not done. Insert parameters!



if __name__ == '__main__':
    app.run()

