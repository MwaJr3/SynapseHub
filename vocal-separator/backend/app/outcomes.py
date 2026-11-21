"""Typed outcomes for the optional Level-2 pass (voice parts and lead/backing split).

Level-2 is best-effort: when it produces nothing the job still succeeds with its
Level-1 stems. Rather than leaving the person with a missing stem and free-text
warnings, every job records one stable *code* plus a fixed plain-English message.
Clients may translate by code; the strings here never include paths, exception
text or other internals.
"""
from __future__ import annotations

READY = "voice_parts_ready"
DISABLED = "voice_analysis_disabled"
NO_VOCAL_ENERGY = "no_vocal_energy"
NO_PART_MET_THRESHOLD = "no_part_met_threshold"
NO_PART_STEMS = "no_part_stems_written"
ALL_PARTS_READY = "all_voice_parts_ready"
NO_VOCALS_IN_SONG = "no_vocals_in_song"
NO_WANTED_PART = "wanted_part_not_present"

MESSAGES: dict[str, str] = {
    READY: "Voice-part stems were reconstructed. They are experimental estimates, not studio multitracks.",
    DISABLED: "Voice analysis was turned off for this job, so only the music stems were made.",
    NO_VOCAL_ENERGY: ("The vocal stem is almost silent, so no voices were analysed. The recording may be "
                      "instrumental, or the vocals may not be centre-panned."),
    NO_PART_MET_THRESHOLD: ("Vocal lines were found, but none had enough evidence to export as a part. "
                            "The analysis is shown instead of guessing."),
    ALL_PARTS_READY: ("Every detected line was assigned to a voice part (soprano to bass). Parts marked best guess "
                      "were placed by pitch order and range fit, not by a confident classification."),
    NO_VOCALS_IN_SONG: "No vocals were found in this recording, so no voice analysis was done.",
    NO_WANTED_PART: ("None of the voice parts you asked for is present in this recording. The parts that were "
                     "found are listed in the analysis."),
    NO_PART_STEMS: "Vocal lines passed the gates but no part stem could be written. Try again.",
}

LEAD_READY = "lead_split_ready"
LEAD_NOT_APPLICABLE = "lead_split_not_applicable"
LEAD_MESSAGES: dict[str, str] = {
    LEAD_READY: "The lead vocal was separated; everything else in the vocal stem is the backing vocals.",
    LEAD_NOT_APPLICABLE: ("No single dominant line was found, so no lead/backing split was made. "
                          "The Vocals stem is unchanged."),
}

CODES = frozenset(MESSAGES) | frozenset(LEAD_MESSAGES)


def describe(code: str) -> dict[str, str]:
    """``{"code", "message"}`` for a known code; unknown codes get a generic safe sentence."""
    msg = MESSAGES.get(code) or LEAD_MESSAGES.get(code) or "The voice-part step ended without a result."
    return {"code": code, "message": msg}
