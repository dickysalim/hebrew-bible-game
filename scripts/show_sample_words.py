import re
import sys
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import List, Tuple, Optional

# Local imports – utilities are located relative to this script
sys.path.append(str(Path(__file__).parent.parent))  # add project root to PYTHONPATH

from utils.hebrew import strip_nikud, split_segments
from lookup.lexical_index import get_lexical_index
from lookup.bdb import get_bdb

# Path to the TAHOT file (Gen‑Deu version)
TAHOT_PATH = Path(__file__).parent / "resources" / "TAHOT" / "TAHOT-Gen-Deu.txt"

@dataclass
class WordRecord:
    word_order: int
    stage_index: int
    book: str
    chapter: str
    verse: str
    heb_nikud: str
    heb_consonant: str
    sbl_transliteration: str
    gloss: str
    dstrongs_chain: str
    strongs_code: str
    grammar_prefix: str
    # LexicalIndex fields
    bdb_code: str = ""
    language: str = ""
    etymology_type: str = ""
    # BDB fields
    word_gloss: str = ""
    root_code: str = ""
    root_heb_nikud: str = ""
    root_heb_consonant: str = ""
    root_gloss: str = ""
    root_sbl_transliteration: str = ""
    # Prefix / suffix details (up to 3 each)
    prefix_1_strongs_code: str = ""
    prefix_1_heb_nikud: str = ""
    prefix_1_heb_consonant: str = ""
    prefix_1_sbl_transliteration: str = ""
    prefix_1_gloss: str = ""
    prefix_2_strongs_code: str = ""
    prefix_2_heb_nikud: str = ""
    prefix_2_heb_consonant: str = ""
    prefix_2_sbl_transliteration: str = ""
    prefix_2_gloss: str = ""
    prefix_3_strongs_code: str = ""
    prefix_3_heb_nikud: str = ""
    prefix_3_heb_consonant: str = ""
    prefix_3_sbl_transliteration: str = ""
    prefix_3_gloss: str = ""
    suffix_1_strongs_code: str = ""
    suffix_1_heb_nikud: str = ""
    suffix_1_heb_consonant: str = ""
    suffix_1_sbl_transliteration: str = ""
    suffix_1_gloss: str = ""
    suffix_2_strongs_code: str = ""
    suffix_2_heb_nikud: str = ""
    suffix_2_heb_consonant: str = ""
    suffix_2_sbl_transliteration: str = ""
    suffix_2_gloss: str = ""
    suffix_3_strongs_code: str = ""
    suffix_3_heb_nikud: str = ""
    suffix_3_heb_consonant: str = ""
    suffix_3_sbl_transliteration: str = ""
    suffix_3_gloss: str = ""

def parse_tahot_line(line: str, order_counter: int, current_stage: int) -> Tuple[Optional[WordRecord], int, int]:
    """Parse a single TAHOT data line into a WordRecord.
    Returns the record (or None if malformed) plus updated counters.
    """
    parts = line.rstrip("\n").split("\t")
    # Expected columns (based on TAHOT format):
    # 0 Ref+Type, 1 Hebrew, 2 Transliteration, 3 Translation, 4 dStrongs, 5 Grammar, ...
    if len(parts) < 6:
        # Not enough columns to parse; skip this line
        return None, order_counter, current_stage
    ref = parts[0]
    heb = parts[1]
    translit = parts[2]
    gloss = parts[3]
    dstrongs = parts[4]
    grammar = parts[5]

    # Ref format: Book.Chapter.Verse#XX=L  (e.g. Gen.1.1#01=L)
    m = re.match(r"([A-Za-z]+)\.(\d+)\.(\d+)(#\d+)?=L", ref)
    if not m:
        # fallback generic values
        book = chapter = verse = ""
    else:
        book, chapter, verse = m.group(1), m.group(2), m.group(3)

    # Extract strongs code from the {} block – there is exactly one such block per line
    root_match = re.search(r"\{(H[^}]*)\}", dstrongs)
    if root_match:
        strong_raw = root_match.group(1)  # e.g. H7218H
        # Strip leading H and any trailing letters -> numeric only
        strong_numeric = re.sub(r"^H", "", strong_raw)
        strong_numeric = re.sub(r"[A-Za-z]+$", "", strong_numeric)
        # Strip leading zeros to match LexicalIndex format (LI stores "430" not "0430")
        strong_numeric = strong_numeric.lstrip('0') or '0'
    else:
        strong_raw = ""
        strong_numeric = ""

    # Hebrew consonant‑only form (strip nikud, backslash suffixes, and / separators)
    heb_consonant = strip_nikud(heb.split("\\")[0]).replace('/', '')

    # Split prefixes / suffixes using utility (returns list and root index)
    heb_segments, root_idx = split_segments(heb, dstrongs)
    strong_segments = [seg for seg in dstrongs.split('/') if seg]
    # Align strong segments (they mirror heb_segments order)
    # Prefixes are elements before root_idx, suffixes after
    prefixes = []
    suffixes = []
    for i, seg in enumerate(strong_segments):
        # Clean strong token (remove any surrounding braces)
        token = seg.strip()
        if token.startswith('{') and token.endswith('}'):
            token = token[1:-1]
        # Remove leading H for storage (numeric + any trailing letters)
        token_clean = token.lstrip('H')
        if i < root_idx:
            prefixes.append(token_clean)
        elif i > root_idx:
            suffixes.append(token_clean)
    # Ensure we have at most 3 each (pad with empty strings)
    while len(prefixes) < 3:
        prefixes.append("")
    while len(suffixes) < 3:
        suffixes.append("")

    # Build the base record
    rec = WordRecord(
        word_order=order_counter,
        stage_index=current_stage,
        book=book,
        chapter=chapter,
        verse=verse,
        heb_nikud=heb.split("\\" )[0].replace("/", ""),
        heb_consonant=heb_consonant,
        sbl_transliteration=translit,
        gloss=gloss,
        dstrongs_chain=dstrongs,
        strongs_code=strong_numeric,
        grammar_prefix=grammar,
    )

    # Attach prefix fields — only segments BEFORE root_idx are prefixes
    rec.prefix_1_strongs_code = prefixes[0]
    rec.prefix_2_strongs_code = prefixes[1]
    rec.prefix_3_strongs_code = prefixes[2]
    prefix_heb = heb_segments[:root_idx]
    rec.prefix_1_heb_nikud = prefix_heb[0] if len(prefix_heb) > 0 else ""
    rec.prefix_2_heb_nikud = prefix_heb[1] if len(prefix_heb) > 1 else ""
    rec.prefix_3_heb_nikud = prefix_heb[2] if len(prefix_heb) > 2 else ""
    rec.prefix_1_heb_consonant = strip_nikud(rec.prefix_1_heb_nikud)
    rec.prefix_2_heb_consonant = strip_nikud(rec.prefix_2_heb_nikud)
    rec.prefix_3_heb_consonant = strip_nikud(rec.prefix_3_heb_nikud)
    # Prefix transliteration — only segments BEFORE root_idx
    translit_segments = translit.split('/')
    prefix_translit = translit_segments[:root_idx]
    rec.prefix_1_sbl_transliteration = prefix_translit[0] if len(prefix_translit) > 0 else ""
    rec.prefix_2_sbl_transliteration = prefix_translit[1] if len(prefix_translit) > 1 else ""
    rec.prefix_3_sbl_transliteration = prefix_translit[2] if len(prefix_translit) > 2 else ""
    # Prefix gloss — split TAHOT gloss column by / and take segments before root_idx
    gloss_segments = gloss.split("/")
    prefix_gloss = gloss_segments[:root_idx]
    rec.prefix_1_gloss = prefix_gloss[0].strip() if len(prefix_gloss) > 0 else ""
    rec.prefix_2_gloss = prefix_gloss[1].strip() if len(prefix_gloss) > 1 else ""
    rec.prefix_3_gloss = prefix_gloss[2].strip() if len(prefix_gloss) > 2 else ""

    # Attach suffix fields (mirroring same logic)
    rec.suffix_1_strongs_code = suffixes[0]
    rec.suffix_2_strongs_code = suffixes[1]
    rec.suffix_3_strongs_code = suffixes[2]
    # suffix heb segments are the ones after root_idx
    suffix_heb = heb_segments[root_idx+1:root_idx+1+len(suffixes)]
    rec.suffix_1_heb_nikud = suffix_heb[0] if len(suffix_heb) > 0 else ""
    rec.suffix_2_heb_nikud = suffix_heb[1] if len(suffix_heb) > 1 else ""
    rec.suffix_3_heb_nikud = suffix_heb[2] if len(suffix_heb) > 2 else ""
    rec.suffix_1_heb_consonant = strip_nikud(rec.suffix_1_heb_nikud)
    rec.suffix_2_heb_consonant = strip_nikud(rec.suffix_2_heb_nikud)
    rec.suffix_3_heb_consonant = strip_nikud(rec.suffix_3_heb_nikud)
    # Suffix transliteration – use remaining translit segments after root
    suffix_translit = translit_segments[root_idx+1:root_idx+1+len(suffixes)]
    rec.suffix_1_sbl_transliteration = suffix_translit[0] if len(suffix_translit) > 0 else ""
    rec.suffix_2_sbl_transliteration = suffix_translit[1] if len(suffix_translit) > 1 else ""
    rec.suffix_3_sbl_transliteration = suffix_translit[2] if len(suffix_translit) > 2 else ""
    # Suffix gloss — take segments after root_idx
    suffix_gloss = gloss_segments[root_idx+1:]
    rec.suffix_1_gloss = suffix_gloss[0].strip() if len(suffix_gloss) > 0 else ""
    rec.suffix_2_gloss = suffix_gloss[1].strip() if len(suffix_gloss) > 1 else ""
    rec.suffix_3_gloss = suffix_gloss[2].strip() if len(suffix_gloss) > 2 else ""

    # LexicalIndex enrichment
    li = get_lexical_index()
    li_entry = li.select_entry(strong_numeric, grammar)
    if li_entry:
        rec.bdb_code = li_entry.bdb or ""
        rec.language = "Hebrew"  # TAHOT is Hebrew; placeholder for future expansion
        rec.etymology_type = li_entry.etym_type

    # BDB enrichment (if we have a bdb_code)
    if rec.bdb_code:
        bdb = get_bdb()
        bdb_entry = bdb.get(rec.bdb_code)
        if bdb_entry:
            rec.word_gloss = bdb_entry.defn or ""
            # Compute root code
            rec.root_code = bdb.get_root_code(rec.bdb_code)
            root_entry = bdb.get(rec.root_code)
            if root_entry:
                rec.root_heb_nikud = root_entry.heb or ""
                rec.root_heb_consonant = strip_nikud(rec.root_heb_nikud)
                # Root gloss handling "status=new"
                if root_entry.status == "new":
                    rec.root_gloss = "Newly discovered, no reliable translation yet"
                else:
                    rec.root_gloss = root_entry.defn or ""
                # Root transliteration from TAHOT — scan for matching consonant form
                with open(TAHOT_PATH, "r", encoding="utf-8") as f:
                    for tah_line in f:
                        if tah_line.startswith("#") or not tah_line.strip():
                            continue
                        cols = tah_line.split("\t")
                        if len(cols) < 3:
                            continue
                        heb_col = cols[1].split("\\")[0].replace("/", "")
                        if strip_nikud(heb_col) == rec.root_heb_consonant:
                            rec.root_sbl_transliteration = cols[2].replace("/", "")
                            break
    return rec, order_counter + 1, current_stage

def main(sample_size: int = 20):
    records: List[WordRecord] = []
    order_counter = 1
    stage_counter = 1
    current_book = ""
    current_chapter = ""
    with open(TAHOT_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            ref_part = line.split("\t")[0]
            m = re.match(r"([A-Za-z]+)\.(\d+)\.(\d+)(#\d+)?=L", ref_part)
            if m:
                book, chap, verse = m.group(1), m.group(2), m.group(3)
                if book != current_book or chap != current_chapter:
                    # new chapter -> increment stage
                    stage_counter += 1 if current_book else 0
                    current_book, current_chapter = book, chap
            else:
                continue
            rec, order_counter, stage_counter = parse_tahot_line(line, order_counter, stage_counter)
            if rec is None:
                continue
            records.append(rec)
            if len(records) >= sample_size:
                break
    # Render Markdown table
    if not records:
        print("No data found.")
        return
    # Header line – list all fields in the order requested by the user
    headers = [
        "word_order", "stage_index", "book", "chapter", "verse", "heb_nikud", "heb_consonant",
        "sbl_transliteration", "gloss", "dstrongs_chain", "strongs_code", "grammar_prefix",
        "bdb_code", "language", "etymology_type", "word_gloss", "root_code", "root_heb_nikud",
        "root_heb_consonant", "root_gloss", "root_sbl_transliteration",
        "prefix_1_strongs_code", "prefix_1_heb_nikud", "prefix_1_heb_consonant", "prefix_1_sbl_transliteration", "prefix_1_gloss",
        "prefix_2_strongs_code", "prefix_2_heb_nikud", "prefix_2_heb_consonant", "prefix_2_sbl_transliteration", "prefix_2_gloss",
        "prefix_3_strongs_code", "prefix_3_heb_nikud", "prefix_3_heb_consonant", "prefix_3_sbl_transliteration", "prefix_3_gloss",
        "suffix_1_strongs_code", "suffix_1_heb_nikud", "suffix_1_heb_consonant", "suffix_1_sbl_transliteration", "suffix_1_gloss",
        "suffix_2_strongs_code", "suffix_2_heb_nikud", "suffix_2_heb_consonant", "suffix_2_sbl_transliteration", "suffix_2_gloss",
        "suffix_3_strongs_code", "suffix_3_heb_nikud", "suffix_3_heb_consonant", "suffix_3_sbl_transliteration", "suffix_3_gloss",
    ]
    # Render each record as schema-value pairs for readability
    for rec in records:
        for field in headers:
            value = getattr(rec, field, "")
            print(f"{field}: {value}")
        print("-" * 40)

if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    main(n)
