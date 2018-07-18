from flask import Flask, render_template, request
from pyqmix import QmixBus, config
import os.path as op

app = Flask(__name__)


## --- App definitions --- ##

# Is this how I combine Flask and React?
@app.route('/')
def detected_pumps():
    pump_list = detect_pumps()
    return render_template('App.js', pumpList=pump_list)

@app.route('/refill', methods=['POST'])
def refill():
    payload = request.json
    pump_ID = payload['pumpID']
    nb_rep = payload['nbRep']
    target_volume = payload['targetVolume']
    flow_rate = payload['flowRate']

    pump_refill(pump_ID, nb_rep, target_volume, flow_rate)

    print(f'Pumping {flow_rate} ....')
    return 201

@app.route('/bubbleCycle', methods=['POST'])
def bubble_cycle():
    payload = request.json
    pump_ID = payload['pumpID']
    volume = payload['volume']
    flow_rate = payload['flowRate']

    print(f'Pumping {flow_rate} ....')
    return 201

@app.route('/rinse', methods=['POST'])
def rinse():
    payload = request.json
    pump_ID = payload['pumpID']
    nb_rep = payload['nbRep']
    syringe_volume = payload['syringeVolume']
    flow_rate = payload['flowRate']

    print(f'Pumping {flow_rate} ....')
    return 201

@app.route('/empty', methods=['POST'])
def empty():
    payload = request.json
    pump_ID = payload['pumpID']
    nb_rep = payload['nbRep']
    syringe_volume = payload['syringeVolume']
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

    return pump_list  # And maybe handles? - or if that'snot possible then fill-level etc.

def pump_refill(pump_ID, nb_rep, target_volume, flow_rate):

    for rep in nb_rep:
        for pump in pump_ID:
            pump.setfill_level(target_volume, flow_rate, blocking_wait=True)
            pump.setfill_level(0, flow_rate, blocking_wait=True)

    pump.setfill_level(target_volume, flow_rate, blocking_wait=True)



if __name__ == '__main__':
    app.run()
