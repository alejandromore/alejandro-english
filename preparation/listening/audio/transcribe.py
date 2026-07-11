"""
Transcribe all MP3 files in the audio folder using OpenAI Whisper (local, free).
Saves transcripts as .txt files alongside the audio files.
Also generates a transcripts.json file with all transcripts for the web app.
"""
import os
import json
import glob
import whisper

AUDIO_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_SIZE = "base"  # Options: tiny, base, small, medium, large

def main():
    print(f"Loading Whisper model '{MODEL_SIZE}'...")
    model = whisper.load_model(MODEL_SIZE)
    print("Model loaded successfully!\n")

    mp3_files = sorted(glob.glob(os.path.join(AUDIO_DIR, "*.mp3")))
    print(f"Found {len(mp3_files)} MP3 files to transcribe.\n")

    transcripts = {}

    for mp3 in mp3_files:
        filename = os.path.basename(mp3)
        name_without_ext = os.path.splitext(filename)[0]
        txt_path = os.path.join(AUDIO_DIR, name_without_ext + ".txt")

        print(f"Transcribing: {filename}")
        result = model.transcribe(mp3, language="en", verbose=False)
        text = result["text"].strip()

        # Save individual .txt file
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"  -> Saved: {name_without_ext}.txt")

        # Add to JSON collection
        transcripts[filename] = text
        print()

    # Save JSON file for the web app to load
    json_path = os.path.join(AUDIO_DIR, "transcripts.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(transcripts, f, indent=2, ensure_ascii=False)
    print(f"All transcripts saved to: transcripts.json")
    print(f"Total files transcribed: {len(transcripts)}")

if __name__ == "__main__":
    main()
