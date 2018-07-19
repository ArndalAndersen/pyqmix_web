from flask import Flask, render_template, request
from flask_restplus import Api, Resource
from flask_restplus.fields import Float
from pyqmix import QmixBus, config, QmixPump
import os.path as op

app = Flask(__name__)
api = Api(app)

## --- App definitions --- ##

pumps = []

pump_client_request = api.model('Pump Request', {
    'target_vol': Float(description='Target volume',
                        required=True,
                        example=5.0),
    'flow_rate': Float(description='Flow rate',
                       required=True,
                       example=0.25)})

@api.route('/api/pumps/<int:pump_id>')
class Pump(Resource):
    def get(self, pump_id):
        return f'You requsted pump {pump_id}.'

    @api.expect(pump_client_request)
    def put(self, pump_id):
        payload = request.json
        target_vol = payload['target_vol']
        flow_rate = payload['flow_rate']

        return (f'You requsted to pump on pump {pump_id},'
                f'target vol: {target_vol}, '
                f'flow rate: {flow_rate}.')

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

@api.route('/api/refill')
class Refill(Resource):
    def post(self):
        payload = request.json
        pump_ID = payload['pumpID']
        nb_rep = payload['nbRep']
        target_volume = payload['targetVolume']
        flow_rate = payload['flowRate']

        pump_refill(pump_ID, nb_rep, target_volume, flow_rate)

        print(f'Pumping {flow_rate} ....')
        return 201

@api.route('/api/bubbleCycle')
class BubbleCycle(Resource):
    def post(self):
        payload = request.json
        pump_ID = payload['pumpID']
        volume = payload['volume']
        flow_rate = payload['flowRate']

        print(f'Pumping {flow_rate} ....')
        return 201


## --- Functions --- ##

def detect_pumps():

    # Initialize connection to the pump system.
    # Example must be updated!
    config_dir = op.normpath('D:/pyqmix_test/config....')
    dll_dir = op.normpath('D:/pyqmix_test/dlls....')

    config.set_qmix_config_dir(config_dir)
    config.set_qmix_dll_dir(dll_dir)

    QmixBus()

    nb_pumps = QmixPump(index=0).n_pumps

    pump_list = [QmixPump(index=pump_index) for pump_index in range(0,nb_pumps)]

    # Make a dictionary of the pumps to return to the front-end

    return pump_list  # Or fill-level etc.


def pump_refill(pump_ID, nb_rep, target_volume, flow_rate):

    for rep in nb_rep:
        for pump in pump_ID:
            pump.setfill_level(target_volume, flow_rate, blocking_wait=True)
            pump.setfill_level(0, flow_rate, blocking_wait=True)

    pump.setfill_level(target_volume, flow_rate, blocking_wait=True)

def pump_empty():
    pass

def close_bus():
    bus.close()

if __name__ == '__main__':
    app.run()
