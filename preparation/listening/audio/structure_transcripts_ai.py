"""
Structure transcripts using Pollinations.ai GET API with urllib.
Processes one transcript at a time with retries and timeout.
"""
import json
import os
import time
import re
import urllib.request
import urllib.parse
import socket

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(SCRIPT_DIR, "transcripts.json")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "transcripts_structured.json")

# Load existing heuristic results as fallback
HEURISTIC_PATH = OUTPUT_PATH


def ask_ai(transcript_text, filename, retries=3):
    """Use Pollinations.ai GET API to structure a transcript."""
    # Truncate to keep prompt reasonable
    text = transcript_text[:2500]
    
    prompt = (
        "Format this TOEFL transcript as JSON array of {speaker, text}. "
        "Intro lines (Lesson, Listen to part of) = Narrator. "
        "Identify speakers from context. Output ONLY JSON, no markdown.\n\n" + text
    )

    encoded = urllib.parse.quote(prompt)
    url = f"https://text.pollinations.ai/{encoded}"

    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = resp.read().decode("utf-8").strip()

            # Extract JSON
            start = result.find("[")
            end = result.rfind("]")
            if start != -1 and end != -1:
                json_str = result[start:end + 1]
                parsed = json.loads(json_str)
                if isinstance(parsed, list) and all("speaker" in item and "text" in item for item in parsed):
                    return parsed

            print(f"    Attempt {attempt+1}: parse failed")
        except socket.timeout:
            print(f"    Attempt {attempt+1}: timeout")
        except Exception as e:
            print(f"    Attempt {attempt+1}: {str(e)[:60]}")
        time.sleep(3)

    return None


def main():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        transcripts = json.load(f)

    # Load existing heuristic results
    heuristic = {}
    if os.path.exists(HEURISTIC_PATH):
        with open(HEURISTIC_PATH, "r", encoding="utf-8") as f:
            heuristic = json.load(f)

    print(f"Processing {len(transcripts)} transcripts with AI...\n")

    structured = {}
    ai_count = 0

    for filename, transcript in transcripts.items():
        print(f"[{filename}]")

        result = ask_ai(transcript, filename)

        if result and len(result) > 1:
            speakers = list(dict.fromkeys(s["speaker"] for s in result))
            print(f"  AI: {len(result)} segments, speakers: {speakers}")
            structured[filename] = result
            ai_count += 1
        elif filename in heuristic:
            print(f"  Using heuristic fallback")
            structured[filename] = heuristic[filename]
        else:
            print(f"  Single block fallback")
            structured[filename] = [{"speaker": "Narrator", "text": transcript}]

        time.sleep(2)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(structured, f, indent=2, ensure_ascii=False)

    print(f"\nDone! AI: {ai_count}/{len(structured)}")
    print(f"Saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
