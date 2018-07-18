from flask import Flask
from pyqmix import QmixBus, config
import os.path as op

app = Flask(__name__)


@app.route('/')
def hello_world():
    return 'Hello World!'
    # render react. Is this how to integrate flask and react?

@app.route('/detect_pumps')
def detect_pumps():

    # Initialize connection to the pump system.
    # Example must be updated!
    config_dir = op.normpath('D:/pyqmix_test/config....')
    dll_dir = op.normpath('D:/pyqmix_test/dlls....')

    config.set_qmix_config_dir(config_dir)
    config.set_qmix_dll_dir(dll_dir)

    QmixBus()

    return pumps

if __name__ == '__main__':
    app.run()
