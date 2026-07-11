"""
Generate audio-data.js from transcripts.json + transcripts_structured.json
Includes structured transcripts with speaker labels.
"""
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(SCRIPT_DIR, "transcripts.json")
STRUCTURED_PATH = os.path.join(SCRIPT_DIR, "transcripts_structured.json")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "..", "audio-data.js")

FILE_META = {
    "ch1_conversation_main_ideas.mp3": {"title": "Ch1 — Conversation: Main Ideas", "desc": "History class discussion about the Columbian Exchange and its advantages.", "category": "Main Ideas", "type": "Lecture"},
    "ch1_lecture_main_ideas_1.mp3": {"title": "Ch1 — Lecture 1: Main Ideas", "desc": "Music class discussion about the history of the piano.", "category": "Main Ideas", "type": "Lecture"},
    "ch1_lecture_main_ideas_2.mp3": {"title": "Ch1 — Lecture 2: Main Ideas", "desc": "History class discussion about the Bronze Age.", "category": "Main Ideas", "type": "Lecture"},
    "ch2_conversation_main_purpose.mp3": {"title": "Ch2 — Conversation: Main Purpose", "desc": "Student and astronomy professor discuss a final paper deadline.", "category": "Purpose", "type": "Conversation"},
    "ch2_lecture_main_purpose_1.mp3": {"title": "Ch2 — Lecture 1: Main Purpose", "desc": "Student and clerk at the Registrar's office discuss a special situation.", "category": "Purpose", "type": "Conversation"},
    "ch2_lecture_main_purpose_2.mp3": {"title": "Ch2 — Lecture 2: Main Purpose", "desc": "Student and librarian discuss finding a movie in the collection.", "category": "Purpose", "type": "Conversation"},
    "ch3_conversation_major_details.mp3": {"title": "Ch3 — Conversation: Major Details", "desc": "Psychology class lecture about Henry Murray's theory of psychogenic needs.", "category": "Major Details", "type": "Lecture"},
    "ch3_lecture_major_details_1.mp3": {"title": "Ch3 — Lecture 1: Major Details", "desc": "Sociology class discussion about theories of crime causes.", "category": "Major Details", "type": "Lecture"},
    "ch3_lecture_major_details_2.mp3": {"title": "Ch3 — Lecture 2: Major Details", "desc": "Student and sociology professor discuss a paper progress.", "category": "Major Details", "type": "Conversation"},
    "ch4_conversation_inferences.mp3": {"title": "Ch4 — Conversation: Inferences", "desc": "Chemistry class lecture about water treatment methods.", "category": "Inferences", "type": "Lecture"},
    "ch4_lecture_inferences.mp3": {"title": "Ch4 — Lecture: Inferences", "desc": "Anthropology class lecture about dynasties in ancient India.", "category": "Inferences", "type": "Lecture"},
    "ch5_lecture_pragmatic_1.mp3": {"title": "Ch5 — Lecture 1: Pragmatic", "desc": "Geology class lecture about mass wasting and mass movement.", "category": "Pragmatic", "type": "Lecture"},
    "ch5_lecture_pragmatic_2.mp3": {"title": "Ch5 — Lecture 2: Pragmatic", "desc": "Biology class discussion about birds and their features.", "category": "Pragmatic", "type": "Lecture"},
    "practice_lecture_1.mp3": {"title": "Practice 1 — Conversation", "desc": "Student and international business professor discuss a final project.", "category": "Practice", "type": "Conversation"},
    "practice_lecture_2.mp3": {"title": "Practice 2 — Conversation", "desc": "Student and housing office employee discuss housing questions.", "category": "Practice", "type": "Conversation"},
    "practice_lecture_3.mp3": {"title": "Practice 3 — Lecture", "desc": "Biology class discussion about biotoxins and their uses.", "category": "Practice", "type": "Lecture"},
}


def js_escape(s):
    """Escape string for JavaScript."""
    return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")


def main():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        transcripts = json.load(f)

    with open(STRUCTURED_PATH, "r", encoding="utf-8") as f:
        structured = json.load(f)

    lines = []
    lines.append("// Auto-generated audio data with structured transcripts (speaker-labeled)")
    lines.append("// Generated from Whisper transcriptions of TOEFL listening practice audios")
    lines.append("var AUDIO_DATA = [")
    lines.append("")

    for filename, transcript in transcripts.items():
        meta = FILE_META.get(filename, {"title": filename, "desc": "", "category": "Practice", "type": "Lecture"})
        segments = structured.get(filename, [{"speaker": "Narrator", "text": transcript}])

        lines.append("  {")
        lines.append(f"    file: 'audio/{js_escape(filename)}',")
        lines.append(f"    title: '{js_escape(meta['title'])}',")
        lines.append(f"    desc: '{js_escape(meta['desc'])}',")
        lines.append(f"    category: '{js_escape(meta['category'])}',")
        lines.append(f"    type: '{js_escape(meta['type'])}',")
        lines.append(f"    transcript: '{js_escape(transcript)}',")

        # Structured transcript as array of {speaker, text}
        lines.append("    transcriptStructured: [")
        for seg in segments:
            lines.append(f"      {{speaker: '{js_escape(seg['speaker'])}', text: '{js_escape(seg['text'])}'}},")
        lines.append("    ]")
        lines.append("  },")
        lines.append("")

    lines.append("];")

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"Generated {OUTPUT_PATH}")
    print(f"Audio files: {len(transcripts)}")
    print(f"File size: {os.path.getsize(OUTPUT_PATH):,} bytes")


if __name__ == "__main__":
    main()
