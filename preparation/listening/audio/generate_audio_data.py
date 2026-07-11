"""
Generate audio-data.js from transcripts.json with metadata for the web app.
"""
import json
import os

AUDIO_DIR = os.path.dirname(os.path.abspath(__file__))

# Load transcripts
with open(os.path.join(AUDIO_DIR, "transcripts.json"), "r", encoding="utf-8") as f:
    transcripts = json.load(f)

# Metadata for each audio file
metadata = {
    "ch1_conversation_main_ideas.mp3": {
        "title": "Ch1 — Conversation: Main Ideas",
        "desc": "History class discussion about the Columbian Exchange and its advantages.",
        "category": "Main Ideas",
        "type": "Conversation"
    },
    "ch1_lecture_main_ideas_1.mp3": {
        "title": "Ch1 — Lecture 1: Main Ideas",
        "desc": "Music class discussion about the history and cultural significance of the piano.",
        "category": "Main Ideas",
        "type": "Lecture"
    },
    "ch1_lecture_main_ideas_2.mp3": {
        "title": "Ch1 — Lecture 2: Main Ideas",
        "desc": "History class discussion about the transition from Bronze Age to Iron Age.",
        "category": "Main Ideas",
        "type": "Lecture"
    },
    "ch2_conversation_main_purpose.mp3": {
        "title": "Ch2 — Conversation: Main Purpose",
        "desc": "Student talks to astronomy professor about extending a final paper deadline.",
        "category": "Purpose",
        "type": "Conversation"
    },
    "ch2_lecture_main_purpose_1.mp3": {
        "title": "Ch2 — Lecture 1: Purpose",
        "desc": "Student and registrar clerk discuss auditing a physics class.",
        "category": "Purpose",
        "type": "Conversation"
    },
    "ch2_lecture_main_purpose_2.mp3": {
        "title": "Ch2 — Lecture 2: Purpose",
        "desc": "Student and librarian discuss checking out a movie for a professor.",
        "category": "Purpose",
        "type": "Conversation"
    },
    "ch3_conversation_major_details.mp3": {
        "title": "Ch3 — Conversation: Major Details",
        "desc": "Psychology lecture on Henry Murray's theory of psychogenic needs.",
        "category": "Major Details",
        "type": "Lecture"
    },
    "ch3_lecture_major_details_1.mp3": {
        "title": "Ch3 — Lecture 1: Major Details",
        "desc": "Sociology class discussion about the Broken Windows theory of crime.",
        "category": "Major Details",
        "type": "Lecture"
    },
    "ch3_lecture_major_details_2.mp3": {
        "title": "Ch3 — Lecture 2: Major Details",
        "desc": "Student and sociology professor discuss cultural diffusion for a paper topic.",
        "category": "Major Details",
        "type": "Conversation"
    },
    "ch4_conversation_inferences.mp3": {
        "title": "Ch4 — Conversation: Inferences",
        "desc": "Chemistry lecture on water treatment methods, specifically adsorption.",
        "category": "Inferences",
        "type": "Lecture"
    },
    "ch4_lecture_inferences.mp3": {
        "title": "Ch4 — Lecture: Inferences",
        "desc": "Anthropology lecture about the Chola Dynasty and their cultural contributions.",
        "category": "Inferences",
        "type": "Lecture"
    },
    "ch5_lecture_pragmatic_1.mp3": {
        "title": "Ch5 — Lecture 1: Pragmatic",
        "desc": "Geology lecture on mass wasting, including flow and creep types.",
        "category": "Pragmatic",
        "type": "Lecture"
    },
    "ch5_lecture_pragmatic_2.mp3": {
        "title": "Ch5 — Lecture 2: Pragmatic",
        "desc": "Biology class discussion about bird flight features and adaptations.",
        "category": "Pragmatic",
        "type": "Lecture"
    },
    "practice_lecture_1.mp3": {
        "title": "Practice 1 — International Business",
        "desc": "Student discusses switching from group project to individual paper with professor.",
        "category": "Practice",
        "type": "Conversation"
    },
    "practice_lecture_2.mp3": {
        "title": "Practice 2 — Housing Office",
        "desc": "Student asks about off-campus housing and learns about the quiet dorm option.",
        "category": "Practice",
        "type": "Conversation"
    },
    "practice_lecture_3.mp3": {
        "title": "Practice 3 — Biotoxins in Medicine",
        "desc": "Biology lecture on biotoxins and their medical applications.",
        "category": "Practice",
        "type": "Lecture"
    }
}

# Build the JS array
lines = []
lines.append("// Auto-generated audio data with transcripts and metadata")
lines.append("// Generated from Whisper transcriptions of TOEFL listening practice audios")
lines.append("var AUDIO_DATA = [")
lines.append("")

for filename, transcript in transcripts.items():
    meta = metadata.get(filename, {"title": filename, "desc": "", "category": "General", "type": "Lecture"})
    # Escape transcript for JS string
    escaped = transcript.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")
    escaped_title = meta["title"].replace("'", "\\'")
    escaped_desc = meta["desc"].replace("'", "\\'")
    escaped_category = meta["category"].replace("'", "\\'")
    escaped_type = meta["type"].replace("'", "\\'")
    
    lines.append("  {")
    lines.append(f"    file: 'audio/{filename}',")
    lines.append(f"    title: '{escaped_title}',")
    lines.append(f"    desc: '{escaped_desc}',")
    lines.append(f"    category: '{escaped_category}',")
    lines.append(f"    type: '{escaped_type}',")
    lines.append(f"    transcript: '{escaped}'")
    lines.append("  },")
    lines.append("")

lines.append("];")

js_content = "\n".join(lines)

output_path = os.path.join(os.path.dirname(AUDIO_DIR), "audio-data.js")
with open(output_path, "w", encoding="utf-8") as f:
    f.write(js_content)

print(f"Generated: {output_path}")
print(f"Total audios: {len(transcripts)}")
print(f"File size: {os.path.getsize(output_path)} bytes")
