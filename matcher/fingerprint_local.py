
import sys
sys.path.append("../dejavu") 
from dejavu import Dejavu
from dejavu_config import config
djv = Dejavu(config)

# Fingerprint local file
djv.fingerprint_file("test_audio/Fatwa1.mp3", song_name="Fatwa1")

print("Fingerprinting done for Fatwa1.mp3")
