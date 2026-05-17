"""Generate SQL for contextual_word_meaning table from TAHOT Genesis data.

Usage:
    python3 scripts/generate_contextual_sql.py [--book Gen] [--limit N]

Output:
    scripts/contextual-word-meaning-import.sql
"""
import re
import sys
import argparse
from pathlib import Path

# Reuse the existing parsing infrastructure
sys.path.append(str(Path(__file__).parent.parent))
from utils.hebrew import strip_nikud, split_segments
from lookup.lexical_index import get_lexical_index
from lookup.bdb import get_bdb

TAHOT_PATH = Path(__file__).parent / "resources" / "TAHOT" / "TAHOT-Gen-Deu.txt"
OUTPUT_PATH = Path(__file__).parent / "contextual-word-meaning-import.sql"

COLUMNS = [
    "word_order", "stage_index", "book", "chapter", "verse",
    "heb_nikud", "heb_consonant", "sbl_transliteration", "gloss",
    "dstrongs_chain", "strongs_code", "grammar_prefix",
    "pos_category", "is_particle",
    "bdb_code", "language", "etymology_type",
    "word_gloss", "root_code", "root_heb_nikud", "root_heb_consonant",
    "root_gloss", "root_sbl_transliteration",
    "prefix_1_strongs_code", "prefix_1_heb_nikud", "prefix_1_heb_consonant",
    "prefix_1_sbl_transliteration", "prefix_1_gloss",
    "prefix_2_strongs_code", "prefix_2_heb_nikud", "prefix_2_heb_consonant",
    "prefix_2_sbl_transliteration", "prefix_2_gloss",
    "prefix_3_strongs_code", "prefix_3_heb_nikud", "prefix_3_heb_consonant",
    "prefix_3_sbl_transliteration", "prefix_3_gloss",
    "suffix_1_strongs_code", "suffix_1_heb_nikud", "suffix_1_heb_consonant",
    "suffix_1_sbl_transliteration", "suffix_1_gloss",
    "suffix_2_strongs_code", "suffix_2_heb_nikud", "suffix_2_heb_consonant",
    "suffix_2_sbl_transliteration", "suffix_2_gloss",
    "suffix_3_strongs_code", "suffix_3_heb_nikud", "suffix_3_heb_consonant",
    "suffix_3_sbl_transliteration", "suffix_3_gloss",
]

# POS codes that are particles (function words with fixed meaning)
_PARTICLE_POS = {'To', 'R', 'Tr', 'Tc', 'Tn', 'Tm', 'Tj', 'Ti', 'C', 'D', 'Td'}

def derive_pos_category(grammar_prefix: str) -> tuple[str, int]:
    """Derive pos_category and is_particle from TAHOT grammar prefix.
    Returns (category_str, is_particle_int).
    """
    # Take the main POS part (last segment after /)
    gram = grammar_prefix.split('/')[-1]
    if gram.startswith('H'):
        gram = gram[1:]
    # Extract POS letters before any digits
    m = re.match(r'[A-Za-z]+', gram)
    if not m:
        return ('unknown', 0)
    pos = m.group(0)
    # Classify
    if pos.startswith('V'):
        return ('verb', 0)
    if pos.startswith('N'):
        return ('noun', 0)
    if pos.startswith('A'):
        return ('adjective', 0)
    if pos.startswith('P'):
        return ('pronoun', 0)
    if pos.startswith('S'):
        return ('suffix_pronoun', 0)
    # Check particle codes (To, Tr, Tc, Tn, Tm, Tj, Ti, Td, R, C, D)
    if pos in _PARTICLE_POS or pos[:2] in _PARTICLE_POS:
        return ('particle', 1)
    return ('other', 0)


def escape_sql(val) -> str:
    """Escape single quotes for SQL string literals."""
    if val is None:
        return ""
    return str(val).replace("'", "''")


def parse_word(line: str, order: int, stage: int, li, bdb_inst):
    """Parse a single TAHOT line and return a dict of column values."""
    parts = line.rstrip("\n").split("\t")
    if len(parts) < 6:
        return None, order, stage

    ref, heb, translit, gloss, dstrongs, grammar = parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]

    m = re.match(r"([A-Za-z]+)\.(\d+)\.(\d+)(#\d+)?=L", ref)
    if not m:
        return None, order, stage
    book, chapter, verse = m.group(1), m.group(2), m.group(3)

    # Strong's extraction
    root_match = re.search(r"\{(H[^}]*)\}", dstrongs)
    if root_match:
        strong_raw = root_match.group(1)
        strong_numeric = re.sub(r"^H", "", strong_raw)
        strong_numeric = re.sub(r"[A-Za-z]+$", "", strong_numeric)
        strong_numeric = strong_numeric.lstrip('0') or '0'
    else:
        strong_raw = ""
        strong_numeric = ""

    heb_nikud = heb.split("\\")[0].replace("/", "")
    heb_consonant = strip_nikud(heb.split("\\")[0]).replace("/", "")

    # Segments
    heb_segments, root_idx = split_segments(heb, dstrongs)
    strong_segments = [seg for seg in dstrongs.split('/') if seg]
    prefixes = []
    suffixes = []
    for i, seg in enumerate(strong_segments):
        token = seg.strip()
        if token.startswith('{') and token.endswith('}'):
            token = token[1:-1]
        token_clean = token.lstrip('H')
        if i < root_idx:
            prefixes.append(token_clean)
        elif i > root_idx:
            suffixes.append(token_clean)
    while len(prefixes) < 3:
        prefixes.append("")
    while len(suffixes) < 3:
        suffixes.append("")

    # Prefix/suffix heb
    prefix_heb = heb_segments[:root_idx]
    suffix_heb_segs = heb_segments[root_idx+1:]

    # Transliteration segments
    translit_segments = translit.split('/')
    prefix_translit = translit_segments[:root_idx]
    suffix_translit = translit_segments[root_idx+1:]

    # Gloss segments
    gloss_segments = gloss.split("/")
    prefix_gloss = gloss_segments[:root_idx]
    suffix_gloss = gloss_segments[root_idx+1:]

    rec = {
        "word_order": order,
        "stage_index": stage,
        "book": book,
        "chapter": chapter,
        "verse": verse,
        "heb_nikud": heb_nikud,
        "heb_consonant": heb_consonant,
        "sbl_transliteration": translit,
        "gloss": gloss,
        "dstrongs_chain": dstrongs,
        "strongs_code": strong_numeric,
        "grammar_prefix": grammar,
        "bdb_code": "",
        "language": "",
        "etymology_type": "",
        "word_gloss": "",
        "root_code": "",
        "root_heb_nikud": "",
        "root_heb_consonant": "",
        "root_gloss": "",
        "root_sbl_transliteration": "",
    }

    # Prefix fields
    for idx in range(3):
        n = idx + 1
        rec[f"prefix_{n}_strongs_code"] = prefixes[idx]
        rec[f"prefix_{n}_heb_nikud"] = prefix_heb[idx] if idx < len(prefix_heb) else ""
        rec[f"prefix_{n}_heb_consonant"] = strip_nikud(rec[f"prefix_{n}_heb_nikud"])
        rec[f"prefix_{n}_sbl_transliteration"] = prefix_translit[idx] if idx < len(prefix_translit) else ""
        rec[f"prefix_{n}_gloss"] = prefix_gloss[idx].strip() if idx < len(prefix_gloss) else ""

    # Suffix fields
    for idx in range(3):
        n = idx + 1
        rec[f"suffix_{n}_strongs_code"] = suffixes[idx]
        rec[f"suffix_{n}_heb_nikud"] = suffix_heb_segs[idx] if idx < len(suffix_heb_segs) else ""
        rec[f"suffix_{n}_heb_consonant"] = strip_nikud(rec[f"suffix_{n}_heb_nikud"])
        rec[f"suffix_{n}_sbl_transliteration"] = suffix_translit[idx] if idx < len(suffix_translit) else ""
        rec[f"suffix_{n}_gloss"] = suffix_gloss[idx].strip() if idx < len(suffix_gloss) else ""

    # LexicalIndex enrichment
    li_entry = li.select_entry(strong_numeric, grammar)
    if li_entry:
        rec["bdb_code"] = li_entry.bdb or ""
        rec["language"] = "Hebrew"
        rec["etymology_type"] = li_entry.etym_type

    # BDB enrichment
    if rec["bdb_code"]:
        bdb_entry = bdb_inst.get(rec["bdb_code"])
        if bdb_entry:
            rec["word_gloss"] = bdb_entry.defn or ""
            rec["root_code"] = bdb_inst.get_root_code(rec["bdb_code"])
            root_entry = bdb_inst.get(rec["root_code"])
            if root_entry:
                rec["root_heb_nikud"] = root_entry.heb or ""
                rec["root_heb_consonant"] = strip_nikud(rec["root_heb_nikud"])
                if root_entry.status == "new":
                    rec["root_gloss"] = "Newly discovered, no reliable translation yet"
                else:
                    rec["root_gloss"] = root_entry.defn or ""
                # Root transliteration from TAHOT scan
                with open(TAHOT_PATH, "r", encoding="utf-8") as f2:
                    for tah_line in f2:
                        if tah_line.startswith("#") or not tah_line.strip():
                            continue
                        cols = tah_line.split("\t")
                        if len(cols) < 3:
                            continue
                        heb_col = cols[1].split("\\")[0].replace("/", "")
                        if strip_nikud(heb_col) == rec["root_heb_consonant"]:
                            rec["root_sbl_transliteration"] = cols[2].replace("/", "")
                            break

    return rec, order + 1, stage


def main():
    parser = argparse.ArgumentParser(description="Generate SQL for contextual_word_meaning")
    parser.add_argument("--book", default="Gen", help="Book prefix to filter (default: Gen)")
    parser.add_argument("--limit", type=int, default=0, help="Max rows (0 = all)")
    args = parser.parse_args()

    print(f"Loading LexicalIndex and BDB...")
    li = get_lexical_index()
    bdb_inst = get_bdb()

    # Pre-cache root transliterations to avoid N*M file scans
    print("Pre-caching root transliterations from TAHOT...")
    root_translit_cache = {}
    with open(TAHOT_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            cols = line.split("\t")
            if len(cols) < 3:
                continue
            heb_col = cols[1].split("\\")[0].replace("/", "")
            consonant = strip_nikud(heb_col)
            if consonant and consonant not in root_translit_cache:
                root_translit_cache[consonant] = cols[2].replace("/", "")

    print(f"Processing {args.book} words...")
    records = []
    order = 1
    stage = 1
    current_book = ""
    current_chapter = ""

    with open(TAHOT_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            ref_part = line.split("\t")[0]
            m = re.match(r"([A-Za-z]+)\.(\d+)\.(\d+)(#\d+)?=L", ref_part)
            if not m:
                continue
            book_name = m.group(1)
            if book_name != args.book:
                continue

            chap = m.group(2)
            if book_name != current_book or chap != current_chapter:
                stage += 1 if current_book else 0
                current_book, current_chapter = book_name, chap

            parts = line.rstrip("\n").split("\t")
            if len(parts) < 6:
                continue

            ref, heb, translit, gloss, dstrongs, grammar = parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]

            # Strong's
            root_match = re.search(r"\{(H[^}]*)\}", dstrongs)
            if root_match:
                strong_raw = root_match.group(1)
                strong_numeric = re.sub(r"^H", "", strong_raw)
                strong_numeric = re.sub(r"[A-Za-z]+$", "", strong_numeric)
                strong_numeric = strong_numeric.lstrip('0') or '0'
            else:
                strong_numeric = ""

            heb_nikud = heb.split("\\")[0].replace("/", "")
            heb_consonant = strip_nikud(heb.split("\\")[0]).replace("/", "")

            heb_segments, root_idx = split_segments(heb, dstrongs)
            strong_segments = [seg for seg in dstrongs.split('/') if seg]
            prefixes_s, suffixes_s = [], []
            for i, seg in enumerate(strong_segments):
                token = seg.strip()
                if token.startswith('{') and token.endswith('}'):
                    token = token[1:-1]
                token_clean = token.lstrip('H')
                if i < root_idx:
                    prefixes_s.append(token_clean)
                elif i > root_idx:
                    suffixes_s.append(token_clean)
            while len(prefixes_s) < 3:
                prefixes_s.append("")
            while len(suffixes_s) < 3:
                suffixes_s.append("")

            prefix_heb = heb_segments[:root_idx]
            suffix_heb_segs = heb_segments[root_idx+1:]
            translit_segments = translit.split('/')
            prefix_translit = translit_segments[:root_idx]
            suffix_translit = translit_segments[root_idx+1:]
            gloss_segments = gloss.split("/")
            prefix_gloss = gloss_segments[:root_idx]
            suffix_gloss = gloss_segments[root_idx+1:]

            rec = {
                "word_order": order,
                "stage_index": stage,
                "book": book_name,
                "chapter": m.group(2),
                "verse": m.group(3),
                "heb_nikud": heb_nikud,
                "heb_consonant": heb_consonant,
                "sbl_transliteration": translit,
                "gloss": gloss,
                "dstrongs_chain": dstrongs,
                "strongs_code": strong_numeric,
                "grammar_prefix": grammar,
                "pos_category": "",
                "is_particle": 0,
                "bdb_code": "",
                "language": "",
                "etymology_type": "",
                "word_gloss": "",
                "root_code": "",
                "root_heb_nikud": "",
                "root_heb_consonant": "",
                "root_gloss": "",
                "root_sbl_transliteration": "",
            }

            for idx in range(3):
                n = idx + 1
                rec[f"prefix_{n}_strongs_code"] = prefixes_s[idx]
                rec[f"prefix_{n}_heb_nikud"] = prefix_heb[idx] if idx < len(prefix_heb) else ""
                rec[f"prefix_{n}_heb_consonant"] = strip_nikud(rec[f"prefix_{n}_heb_nikud"])
                rec[f"prefix_{n}_sbl_transliteration"] = prefix_translit[idx] if idx < len(prefix_translit) else ""
                rec[f"prefix_{n}_gloss"] = prefix_gloss[idx].strip() if idx < len(prefix_gloss) else ""

            for idx in range(3):
                n = idx + 1
                rec[f"suffix_{n}_strongs_code"] = suffixes_s[idx]
                rec[f"suffix_{n}_heb_nikud"] = suffix_heb_segs[idx] if idx < len(suffix_heb_segs) else ""
                rec[f"suffix_{n}_heb_consonant"] = strip_nikud(rec[f"suffix_{n}_heb_nikud"])
                rec[f"suffix_{n}_sbl_transliteration"] = suffix_translit[idx] if idx < len(suffix_translit) else ""
                rec[f"suffix_{n}_gloss"] = suffix_gloss[idx].strip() if idx < len(suffix_gloss) else ""

            # POS category
            pos_cat, is_part = derive_pos_category(grammar)
            rec["pos_category"] = pos_cat
            rec["is_particle"] = is_part

            # LI enrichment
            li_entry = li.select_entry(strong_numeric, grammar)
            if li_entry:
                rec["bdb_code"] = li_entry.bdb or ""
                rec["language"] = "Hebrew"
                rec["etymology_type"] = li_entry.etym_type

            # BDB enrichment
            if rec["bdb_code"]:
                bdb_entry = bdb_inst.get(rec["bdb_code"])
                if bdb_entry:
                    rec["word_gloss"] = bdb_entry.defn or ""
                    rec["root_code"] = bdb_inst.get_root_code(rec["bdb_code"])
                    root_entry = bdb_inst.get(rec["root_code"])
                    if root_entry:
                        rec["root_heb_nikud"] = root_entry.heb or ""
                        rec["root_heb_consonant"] = strip_nikud(rec["root_heb_nikud"])
                        if root_entry.status == "new":
                            rec["root_gloss"] = "Newly discovered, no reliable translation yet"
                        else:
                            rec["root_gloss"] = root_entry.defn or ""
                        # Root transliteration from cache
                        rec["root_sbl_transliteration"] = root_translit_cache.get(rec["root_heb_consonant"], "")

            records.append(rec)
            order += 1

            if args.limit and len(records) >= args.limit:
                break

            if len(records) % 1000 == 0:
                print(f"  Processed {len(records)} words...")

    print(f"Total words: {len(records)}")

    # Generate SQL
    col_defs = ",\n  ".join([
        "word_order INTEGER",
        "stage_index INTEGER",
        "book TEXT",
        "chapter TEXT",
        "verse TEXT",
        "heb_nikud TEXT",
        "heb_consonant TEXT",
        "sbl_transliteration TEXT",
        "gloss TEXT",
        "dstrongs_chain TEXT",
        "strongs_code TEXT",
        "grammar_prefix TEXT",
        "pos_category TEXT",
        "is_particle INTEGER DEFAULT 0",
        "bdb_code TEXT",
        "language TEXT",
        "etymology_type TEXT",
        "word_gloss TEXT",
        "root_code TEXT",
        "root_heb_nikud TEXT",
        "root_heb_consonant TEXT",
        "root_gloss TEXT",
        "root_sbl_transliteration TEXT",
        "prefix_1_strongs_code TEXT",
        "prefix_1_heb_nikud TEXT",
        "prefix_1_heb_consonant TEXT",
        "prefix_1_sbl_transliteration TEXT",
        "prefix_1_gloss TEXT",
        "prefix_2_strongs_code TEXT",
        "prefix_2_heb_nikud TEXT",
        "prefix_2_heb_consonant TEXT",
        "prefix_2_sbl_transliteration TEXT",
        "prefix_2_gloss TEXT",
        "prefix_3_strongs_code TEXT",
        "prefix_3_heb_nikud TEXT",
        "prefix_3_heb_consonant TEXT",
        "prefix_3_sbl_transliteration TEXT",
        "prefix_3_gloss TEXT",
        "suffix_1_strongs_code TEXT",
        "suffix_1_heb_nikud TEXT",
        "suffix_1_heb_consonant TEXT",
        "suffix_1_sbl_transliteration TEXT",
        "suffix_1_gloss TEXT",
        "suffix_2_strongs_code TEXT",
        "suffix_2_heb_nikud TEXT",
        "suffix_2_heb_consonant TEXT",
        "suffix_2_sbl_transliteration TEXT",
        "suffix_2_gloss TEXT",
        "suffix_3_strongs_code TEXT",
        "suffix_3_heb_nikud TEXT",
        "suffix_3_heb_consonant TEXT",
        "suffix_3_sbl_transliteration TEXT",
        "suffix_3_gloss TEXT",
    ])

    with open(OUTPUT_PATH, "w", encoding="utf-8") as out:
        out.write("-- Auto-generated contextual_word_meaning import\n")
        out.write(f"-- Book: {args.book} | Total rows: {len(records)}\n\n")
        out.write(f"CREATE TABLE IF NOT EXISTS contextual_word_meaning (\n  {col_defs},\n  PRIMARY KEY (book, chapter, verse, word_order)\n);\n\n")

        for rec in records:
            vals = []
            for col in COLUMNS:
                v = rec.get(col, "")
                if isinstance(v, int):
                    vals.append(str(v))
                else:
                    vals.append(f"'{escape_sql(v)}'")
            col_names = ", ".join(COLUMNS)
            val_str = ", ".join(vals)
            out.write(f"INSERT OR IGNORE INTO contextual_word_meaning ({col_names}) VALUES ({val_str});\n")

    print(f"SQL written to {OUTPUT_PATH}")
    print(f"Run: npx wrangler d1 execute hebrew-lexicon --remote --file=scripts/contextual-word-meaning-import.sql")


if __name__ == "__main__":
    main()
