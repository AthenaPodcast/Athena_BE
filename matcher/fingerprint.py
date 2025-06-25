import cloudinary
import cloudinary.api
import cloudinary.uploader
import requests
import os
import sys
import random
sys.path.append("../dejavu")
from pydub import AudioSegment
from dejavu import Dejavu
from dejavu.logic.recognizer.file_recognizer import FileRecognizer
from dejavu_config import config


cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

djv = Dejavu(config)

# Function to split large mp3 into 60-second chunks
def split_audio(file_path, chunk_length_sec=60):
    audio = AudioSegment.from_file(file_path)
    chunks = []
    file_name = os.path.splitext(os.path.basename(file_path))[0]
    for i in range(0, len(audio), chunk_length_sec * 1000):
        chunk = audio[i:i + chunk_length_sec * 1000]
        chunk_path = f"{file_name}_chunk_{i//1000}.mp3"
        chunk.export(chunk_path, format="mp3")
        chunks.append(chunk_path)
    return chunks

# get list of audio files from cloudinary (used for testing)
def fingerprint_all_mp3s():
    result = cloudinary.Search() \
        .expression("resource_type:video AND format:mp3") \
        .sort_by("public_id", "desc") \
        .max_results(100) \
        .execute()

    for item in result['resources']:
        url = item['url']
        name = item['public_id'].split('/')[-1]

        print(f"Downloading and fingerprinting: {name}")

        audio_path = f"temp_{name}.mp3"
        with open(audio_path, 'wb') as f:
            f.write(requests.get(url).content)

        try:
            djv.fingerprint_file(audio_path, song_name=name)
        except Exception as e:
            print(f"Failed to fingerprint {name}: {e}")
        os.remove(audio_path)

def fingerprint_one_mp3():
    result = cloudinary.Search() \
        .expression("resource_type:video AND format:mp3") \
        .sort_by("public_id", "desc") \
        .max_results(1) \
        .execute()

    for item in result['resources']:
        url = item['url']
        public_id = item['public_id']
        print(f"Selected: {public_id}")

        response = requests.get(url, stream=True)
        local_path = f"temp_{public_id}.mp3"
        with open(local_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        try:
            # Split if larger than 30MB
            size_mb = os.path.getsize(local_path) / (1024 * 1024)
            if size_mb > 30:
                print(f"Large file ({size_mb:.2f} MB) — splitting...")
                chunks = split_audio(local_path)
                for chunk in chunks:
                    djv.fingerprint_file(chunk, song_name=public_id)
                    os.remove(chunk)
                print(f"Fingerprinted all chunks for: {public_id}")
            else:
                djv.fingerprint_file(local_path, song_name=public_id)
                print(f"Fingerprinted: {public_id}")
        except Exception as e:
            print(f"Failed to fingerprint {public_id}: {e}")
        finally:
            os.remove(local_path)
            print(f"Deleted: {local_path}")


if __name__ == "__main__":
    fingerprint_one_mp3()
