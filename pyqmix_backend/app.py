from flask import Flask, request
from flask_restplus import Api, Resource
from flask_restplus.fields import Float, Boolean, String
from pyqmix import QmixBus, config, QmixPump
import os.path as op
import time

app = Flask(__name__)
api = Api(app)

persistant_objects = {
    'bus': None,
    'pumps': {},
    'starting_pumps_timer': None,
    'ispumping': None,
    'get_pumps_states_call_count': 0}

## --- Choose session type --- ##
app.config.from_object(__name__)
app.config['test_session'] = True
app.secret_key = 'Camilla'

## --- Flask-RESTPlus models --- ##
pump_client_request = api.model('Refill request', {
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

initiate_pumps_request = api.model('Initiate pumps', {
    'PumpInitiate': Boolean(desription='Initiate pumps',
                        required=True,
                        example=True)})

## --- Endpoints --- ##

@api.route('/api/pumps')
class InitiatePumps(Resource):

    def get(self):
        persistant_objects['get_pumps_states_call_count'] +=1
        pump_states = []
        for pump_id in persistant_objects['pumps']:
            pump_state = get_pump_status(pump_id)
            pump_states.append(pump_state)

        return pump_states

    @api.expect(initiate_pumps_request)
    def put(self):  # Post: client posts info
        payload = request.json
        initiate_pumps = payload['PumpInitiate']
        print(payload)  # Goes to python console

        if initiate_pumps:
            # How do I update the local variable with this value?
            detect_and_find_availablePumps()
        else:
            disconnect_pumps()

        available_pumps = list(persistant_objects['pumps'].keys())

        return available_pumps


@api.route('/api/pumps/<int:pump_id>')
class Pumps(Resource):
    def get(self, pump_id):

        pump_status = get_pump_status(pump_id)

        return pump_status

    @api.expect(pump_client_request)
    def put(self, pump_id):
        payload = request.json
        target_volume = payload['targetVolume']
        volume_unit = payload['volumeUnit']
        flow_rate = payload['flowRate']
        flow_unit = payload['flowUnit']

        # Initiate pump command
        start_pumping(pump_id=pump_id, target_volume=target_volume, volume_unit=volume_unit, flow_rate=flow_rate, flow_unit=flow_unit)

        return 201

@api.route('/api/ispumping')
class IsPumping(Resource):

    def get(self):
        ispumping()
        return persistant_objects['ispumping']

@api.route('/api/')
class Main(Resource):
    def get(self):
        # pump_list = detect_pumps()
        # return render_template('', pumpList=pump_list)
        response = {'foo': 1, 'bar': 2}
        return response

    def post(self):
        response = {'foo': 1, 'bar': 2}
        return response


## --- Functions --- ##

def detect_and_find_availablePumps():

    if app.config['test_session']:
        available_pumps = list(range(0, 5))
        pump_objects = list(range(0, 5))
        persistant_objects['bus'] = 'I am a Qmix Bus.'
    else:
        # Initialize connection to the pump system.
        config_dir = op.normpath('C:/Users/Public/Documents/QmixElements/Projects/default_project/Configurations/one_pump')
        dll_dir = op.normpath('C:/Users/au278141/AppData/Local/QmixSDK')

        config.set_qmix_config_dir(config_dir)
        config.set_qmix_dll_dir(dll_dir)

        persistant_objects['bus'] = QmixBus()

        nb_pumps = QmixPump(index=0).n_pumps

        available_pumps = [str(i) for i in range(0,nb_pumps)]
        pump_objects = [QmixPump(index=pump_index) for pump_index in range(0, nb_pumps)]

    # Dict from zip
    persistant_objects['pumps'] = dict(zip(available_pumps, pump_objects))


def disconnect_pumps():

    if not app.config['test_session']:
        bus = persistant_objects['bus']
        bus.close()

    print(f'Bus before "closing": {persistant_objects["bus"]}')
    persistant_objects['bus'] = None
    print(f'Bus after "closing": {persistant_objects["bus"]}')

    persistant_objects['pumps'] = {}

def start_pumping(pump_id, target_volume, volume_unit, flow_rate, flow_unit):

    if app.config['test_session']:
        persistant_objects['starting_pumps_timer'] = time.time()
        print(f'Starting virtual pump: {pump_id} and setting '
              f'target_volume to {target_volume} {volume_unit} '
              f'at {flow_rate} {flow_unit}')
    else:
        persistant_objects['pumps'][str(pump_id)].set_fill_level()  # Not done. Insert parameters!

def ispumping():

    if app.config['test_session']:
        time_when_pumps_started = persistant_objects['starting_pumps_timer']
        time_now = time.time()
        seconds_since_pump_initiation = time_now - time_when_pumps_started
        if seconds_since_pump_initiation < 15:
            persistant_objects['ispumping'] = True
        else:
            persistant_objects['ispumping'] = False

    else:
        ispumping_pumps = [pump.ispumping for pump_name, pump in persistant_objects['pumps'].items()]
        if any(ispumping_pumps):
            persistant_objects['ispumping'] = True
        else:
            persistant_objects['ispumping'] = False



def get_pump_status(pump_id):

    pump = persistant_objects['pumps'][pump_id]


    if app.config['test_session']:
        pump_status = {
            'index': pump_id,
            'isPumping': persistant_objects['get_pumps_states_call_count']%5 != 0,
            'fill_level': 20,
            'volume_unit': 'mL',
            'name': 'Midpressure 3'}

    else:
        pump_status = {
            'index': pump_id,
            'is_pumping': pump.ispumping,
            'fill_level': pump.fill_level,
            'volume_unit': pump.volume_unit,
            'name': pump.name}

    return pump_status

if __name__ == '__main__':
    app.run()

