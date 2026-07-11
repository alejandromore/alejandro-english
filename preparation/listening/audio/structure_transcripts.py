"""
Smart heuristic parser for TOEFL listening transcripts.
Uses narrator intro patterns and turn-taking rules to identify speakers.
"""
import json
import re
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(SCRIPT_DIR, "transcripts.json")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "transcripts_structured.json")


def split_sentences(text):
    """Split text into sentences."""
    sentences = re.split(r'(?<=[.?!])\s+', text.strip())
    return [s.strip() for s in sentences if s.strip()]


def parse_narrator_and_speakers(sentences):
    """
    Extract narrator intro and determine speaker roles from it.
    Narrator always ends with 'Listen to part of a...' or 'Listen to a...'
    """
    narrator = []
    speaker_roles = ["Professor", "Student"]
    passage_type = "lecture"
    idx = 0

    for i, s in enumerate(sentences):
        s_lower = s.lower()
        narrator.append(s)
        idx = i + 1

        # Check if this sentence contains "Listen to part of" or "Listen to a"
        if "listen to part of" in s_lower or "listen to a" in s_lower:
            # This is the end of the narrator intro
            # Parse speaker roles from this sentence
            if "conversation between" in s_lower:
                passage_type = "conversation"
                # Extract roles
                if "professor" in s_lower:
                    speaker_roles[0] = "Professor"
                elif "librarian" in s_lower:
                    speaker_roles[0] = "Librarian"
                elif "clerk" in s_lower:
                    speaker_roles[0] = "Clerk"
                elif "employee" in s_lower:
                    speaker_roles[0] = "Employee"
                elif "advisor" in s_lower:
                    speaker_roles[0] = "Advisor"
                else:
                    speaker_roles[0] = "Speaker"
                speaker_roles[1] = "Student"
            elif "discussion" in s_lower or "lecture" in s_lower:
                passage_type = "lecture"
                speaker_roles = ["Professor", "Student"]
            break

    return narrator, sentences[idx:], speaker_roles, passage_type


def detect_names(sentences, speaker_roles):
    """Detect actual names from the dialogue."""
    roles = list(speaker_roles)
    prof_name = roles[0]
    stu_name = roles[1]

    for s in sentences[:12]:
        # "Hi, professor X" -> student greeting, get professor's name
        m = re.search(r'[Hh]i,?\s+professor\s+([A-Z][a-z]+)', s)
        if m:
            prof_name = "Professor " + m.group(1)

        # "Hi [Name]" (not "professor") -> student name or authority greeting
        m = re.match(r'^[Hh]i,?\s+([A-Z][a-z]+)', s)
        if m and m.group(1) != "Professor":
            name = m.group(1)
            if name not in ["The", "A", "An", "So", "But", "Okay", "Well", "Now"]:
                # If next sentence is a greeting back, this is the student
                stu_name = name

        # "Sure [Name]" / "Yes [Name]?" / "Of course [Name]" -> authority addressing student
        m = re.match(r'^(?:Sure|Yes|Okay|Right|Of course),?\s+([A-Z][a-z]+)\??', s)
        if m:
            name = m.group(1)
            if name not in ["The", "A", "An", "So", "But", "And", "Okay", "Well", "Now",
                            "I", "It", "We", "They", "That", "This", "There", "What",
                            "When", "Where", "Why", "How", "Which", "Who", "Professor"]:
                stu_name = name

        # "Excuse me, Professor X" -> student addressing professor
        m = re.search(r'[Ee]xcuse me,?\s+professor\s+([A-Z][a-z]+)', s)
        if m:
            prof_name = "Professor " + m.group(1)

    return [prof_name, stu_name]


def is_student_sentence(s):
    """Detect if a sentence sounds like a student speaking."""
    s_lower = s.lower().strip()

    # Strong student indicators
    patterns = [
        r"^(wasn't it|isn't it|don't they|aren't they|couldn't|wouldn't|shouldn't)",
        r"^(i think|i was|i'm|i have|i had|i would|i'd|i'll|i just|i actually)",
        r"^(could i|can i|do you|would it|what if|how about|what about)",
        r"^(hi|hello|hey|excuse me)",
        r"^(yeah|yes,|no,)\s",
        r"^(i'm just|i'm sorry|i'm wondering|i'm hoping|i'm confused|i'm not)",
        r"^(so i|but i|and i|well i)",
        r"^(my|the thing|one more|quick|kind of)",
        r"^(like donkeys|like horses|like,)",
    ]
    for pat in patterns:
        if re.match(pat, s_lower):
            return True

    # Short question (likely student interjection)
    if s.endswith("?") and len(s.split()) <= 8:
        return True

    return False


def is_professor_sentence(s):
    """Detect if a sentence sounds like a professor speaking."""
    s_lower = s.lower().strip()

    patterns = [
        r"^(that's right|that's correct|exactly|precisely|good)",
        r"^(good question|good point|great question|excellent)",
        r"^(yes,? that's|well,?|sure,?|of course|actually,?|as i|by the)",
        r"^(the |in |on |for |when |after |before |during |according)",
        r"^(now,?|okay,?|so,?|let's|let me|we'll|we've|we're|we talked)",
        r"^(see,?|look|think about|remember|keep in mind|note that)",
        r"^(one |two |three |first|second|third|another|also|finally)",
        r"^(what does|what is|what was|who can|how do|why do|can anyone)",
        r"^(it's|its|this is|these are|that was|those were)",
        r"^(good morning|good afternoon|good evening)",
        r"^(okay,? so|okay,? well|okay,? last)",
        r"^(personally|according|in \d{4})",
    ]
    for pat in patterns:
        if re.match(pat, s_lower):
            return True

    # Long explanatory sentence (likely professor)
    if len(s.split()) > 15 and not s.endswith("?"):
        return True

    return False


def structure_conversation(sentences, speaker_roles):
    """Structure a conversation with alternating speakers."""
    speakers = detect_names(sentences, speaker_roles)
    prof_name, stu_name = speakers[0], speakers[1]

    segments = []
    # Determine who speaks first
    first = sentences[0] if sentences else ""
    if re.match(r'^(Hi|Hello|Hey|Excuse me)', first, re.I):
        # Could be either - check if it's "Hi, professor X" (student) or "Hi there" (authority)
        if "professor" in first.lower() or re.match(r'^[Hh]i,?\s+[A-Z]', first):
            current_speaker = stu_name  # Student greeting professor
        else:
            current_speaker = prof_name  # Authority greeting student
    elif re.match(r'^(Good morning|Good afternoon|How can I help)', first, re.I):
        current_speaker = prof_name  # Authority greets
    else:
        current_speaker = prof_name

    current_text = []
    turn_count = 0

    for i, s in enumerate(sentences):
        is_greeting = bool(re.match(r'^(Hi|Hello|Hey|Excuse me)', s, re.I))
        is_name_call = bool(re.match(rf'^(Yes|Sure|Okay|Right|Of course),?\s+{re.escape(stu_name)}\??', s))
        student_ind = is_student_sentence(s)
        prof_ind = is_professor_sentence(s)

        should_switch = False
        new_speaker = current_speaker

        if is_greeting and current_text and i > 0:
            # New greeting = other speaker
            should_switch = True
            new_speaker = stu_name if current_speaker == prof_name else prof_name
        elif is_name_call:
            should_switch = True
            new_speaker = prof_name
        elif student_ind and current_speaker == prof_name and len(current_text) >= 2:
            should_switch = True
            new_speaker = stu_name
        elif prof_ind and current_speaker == stu_name and len(current_text) >= 1:
            should_switch = True
            new_speaker = prof_name
        elif current_speaker == stu_name and len(current_text) >= 3 and prof_ind:
            should_switch = True
            new_speaker = prof_name
        elif current_speaker == prof_name and len(current_text) >= 4 and student_ind:
            should_switch = True
            new_speaker = stu_name

        if should_switch and current_text:
            segments.append({"speaker": current_speaker, "text": " ".join(current_text)})
            current_text = []
            current_speaker = new_speaker
            turn_count += 1

        current_text.append(s)

    if current_text:
        segments.append({"speaker": current_speaker, "text": " ".join(current_text)})

    return segments


def structure_lecture(sentences, speaker_roles):
    """Structure a lecture - mostly professor with student interjections."""
    speakers = detect_names(sentences, speaker_roles)
    prof_name, stu_name = speakers[0], speakers[1]

    segments = []
    current_speaker = prof_name
    current_text = []

    for i, s in enumerate(sentences):
        # Professor calling on student: "Yes, [Name]?"
        call_match = re.match(r'^(Yes|Sure|Okay|Right),?\s+([A-Z][a-z]+)\?', s)
        student_ind = is_student_sentence(s)
        prof_ind = is_professor_sentence(s)

        should_switch = False
        new_speaker = current_speaker

        if call_match and current_speaker == prof_name:
            # This sentence is professor calling on student
            current_text.append(s)
            if current_text:
                segments.append({"speaker": prof_name, "text": " ".join(current_text)})
                current_text = []
            current_speaker = stu_name
            # Update student name
            name = call_match.group(2)
            if name not in ["The", "A", "An", "So", "But", "Okay", "Well"]:
                stu_name = name
            continue
        elif student_ind and current_speaker == prof_name and len(current_text) >= 2:
            should_switch = True
            new_speaker = stu_name
        elif prof_ind and current_speaker == stu_name and current_text:
            should_switch = True
            new_speaker = prof_name
        elif current_speaker == stu_name and len(current_text) >= 1 and not student_ind and not s.endswith("?"):
            # Student said their piece, professor resumes
            should_switch = True
            new_speaker = prof_name

        if should_switch and current_text:
            segments.append({"speaker": current_speaker, "text": " ".join(current_text)})
            current_text = []
            current_speaker = new_speaker

        current_text.append(s)

    if current_text:
        segments.append({"speaker": current_speaker, "text": " ".join(current_text)})

    return segments


def structure_transcript(transcript, filename):
    """Main function to structure a transcript."""
    sentences = split_sentences(transcript)
    if not sentences:
        return [{"speaker": "Narrator", "text": transcript}]

    narrator, remaining, speaker_roles, passage_type = parse_narrator_and_speakers(sentences)

    segments = []
    if narrator:
        segments.append({"speaker": "Narrator", "text": " ".join(narrator)})

    if not remaining:
        return segments

    if passage_type == "conversation":
        content = structure_conversation(remaining, speaker_roles)
    else:
        content = structure_lecture(remaining, speaker_roles)

    segments.extend(content)
    return segments


def main():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        transcripts = json.load(f)

    print(f"Processing {len(transcripts)} transcripts...\n")

    structured = {}
    for filename, transcript in transcripts.items():
        segments = structure_transcript(transcript, filename)
        structured[filename] = segments
        speakers = list(dict.fromkeys(s["speaker"] for s in segments))
        print(f"{filename}:")
        print(f"  {len(segments)} segments, speakers: {speakers}")
        for s in segments[:4]:
            print(f"  [{s['speaker']}]: {s['text'][:80]}...")
        print()

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(structured, f, indent=2, ensure_ascii=False)

    multi = sum(1 for v in structured.values() if len(set(s["speaker"] for s in v)) > 1)
    print(f"Multi-speaker: {multi}/{len(structured)}")
    print(f"Saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
