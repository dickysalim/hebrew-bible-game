import re

# Unicode range for Hebrew vowel points (nikud) and cantillation marks
_NIKUD_RE = re.compile(r"[\u0591-\u05C7]")

def strip_nikud(text: str) -> str:
    """Remove all Hebrew diacritics (nikud and cantillation) from a string.
    Returns the consonant‑only form.
    """
    return _NIKUD_RE.sub("", text)

def split_segments(hebrew: str, dstrongs: str):
    """Split a Hebrew word into prefix, root, suffix segments.
    * ``hebrew`` – the raw Hebrew column (may contain backslash punctuation).
    * ``dstrongs`` – the dStrong column containing one ``{H…}`` segment.
    Returns ``(segments, root_index)`` where ``segments`` is a list of the
    Hebrew pieces (prefixes + root + suffixes) and ``root_index`` is the
    integer position of the root segment.
    """
    # Remove any trailing punctuation after a backslash (e.g. "\׃")
    heb_clean = hebrew.split("\\")[0]
    parts = heb_clean.split("/")
    # Identify which part corresponds to the ``{}`` dStrong entry
    root_match = re.search(r"\{(H[^}]*)\}", dstrongs)
    if not root_match:
        # No explicit root marker – treat the whole word as a single segment
        return parts, 0
    # The dStrong chain mirrors the Hebrew segments order; we can locate
    # the root by counting the number of ``/`` before the ``{}`` token.
    # Build a list of the dStrong pieces mirroring the Hebrew split.
    d_parts = []
    for token in dstrongs.split('/'):
        token = token.strip()
        if not token:
            continue
        d_parts.append(token)
    # Find index where token contains braces
    root_idx = next((i for i, t in enumerate(d_parts) if t.startswith('{') and t.endswith('}')), None)
    if root_idx is None:
        root_idx = 0
    return parts, root_idx

def split_parallel_columns(col: str):
    """Utility to split a column that uses ``/`` as a delimiter.
    Returns a list of strings. Empty strings are kept to preserve alignment.
    """
    return col.split('/')
