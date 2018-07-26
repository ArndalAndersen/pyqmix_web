from pyqmix import QmixBus, config, QmixPump
import os.path as op

config_dir = op.normpath('C:/Users/Public/Documents/QmixElements/Projects/default_project/Configurations/five_pumps_laptop')
dll_dir = op.normpath('C:/Users/au278141/AppData/Local/QmixSDK')

config.set_qmix_config_dir(config_dir)
config.set_qmix_dll_dir(dll_dir)

bus = QmixBus()

nb_pumps = QmixPump(index=0).n_pumps

print(nb_pumps)
