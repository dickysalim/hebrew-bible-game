import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Any

# Namespace used in LexicalIndex.xml
NS = "http://openscriptures.github.com/morphhb/namespace"

class LexicalIndexEntry:
    def __init__(self, entry_id: str, strong: str, aug: str | None, pos: str, bdb: str, defn: str, xlit: str, etym_type: str = ""):
        self.entry_id = entry_id
        self.strong = strong
        self.aug = aug
        self.pos = pos
        self.bdb = bdb
        self.defn = defn
        self.xlit = xlit
        self.etym_type = etym_type

    def as_dict(self) -> Dict[str, Any]:
        return {
            "entry_id": self.entry_id,
            "strong": self.strong,
            "aug": self.aug,
            "pos": self.pos,
            "bdb": self.bdb,
            "defn": self.defn,
            "xlit": self.xlit,
            "etym_type": self.etym_type,
        }

class LexicalIndex:
    def __init__(self, xml_path: str | Path):
        self.path = Path(xml_path)
        self.entries_by_strong: Dict[str, List[LexicalIndexEntry]] = {}
        self.entries_by_bdb: Dict[str, LexicalIndexEntry] = {}
        self._load()

    def _load(self):
        tree = ET.parse(self.path)
        root = tree.getroot()
        for entry in root.iter(f"{{{NS}}}entry"):
            entry_id = entry.get("id")
            # word element
            w_el = entry.find(f"{{{NS}}}w")
            xlit = w_el.get("xlit") if w_el is not None else ""
            # pos element
            pos_el = entry.find(f"{{{NS}}}pos")
            pos = pos_el.text if pos_el is not None else ""
            # def element
            def_el = entry.find(f"{{{NS}}}def")
            defn = def_el.text if def_el is not None else ""
            # xref element (may have multiple attributes)
            xref_el = entry.find(f"{{{NS}}}xref")
            if xref_el is None:
                continue
            strong = xref_el.get("strong")
            aug = xref_el.get("aug")
            bdb = xref_el.get("bdb")
            if not strong:
                continue
            # etym element carries the etymology type (main/sub/single)
            etym_el = entry.find(f"{{{NS}}}etym")
            etym_type = etym_el.get("type", "") if etym_el is not None else ""
            li_entry = LexicalIndexEntry(entry_id, strong, aug, pos, bdb, defn, xlit, etym_type)
            self.entries_by_strong.setdefault(strong, []).append(li_entry)
            if bdb:
                self.entries_by_bdb[bdb] = li_entry

    def get_entries(self, strong_code: str) -> List[LexicalIndexEntry]:
        """Return all LexicalIndex entries for a given strong numeric code (e.g. "7218")."""
        return self.entries_by_strong.get(strong_code, [])

    def get_by_bdb(self, bdb_code: str) -> LexicalIndexEntry | None:
        """Return a LexicalIndex entry by its BDB code (e.g. "t.ad.aa")."""
        return self.entries_by_bdb.get(bdb_code)

    def select_entry(self, strong_code: str, grammar_prefix: str) -> LexicalIndexEntry | None:
        """Select the appropriate LexicalIndex entry based on the grammar prefix.
        The first character after the leading 'H' in the grammar string indicates the noun type:
            N  -> common noun (pos "N")
            Np -> proper noun (pos "Np")
            Ng -> gentilic (pos "Ng")
            V  -> verb (pos "V")
        If a matching entry exists, it is returned; otherwise the first entry is returned as a fallback.
        """
        entries = self.get_entries(strong_code)
        if not entries:
            return None
        # Determine expected pos from grammar_prefix
        # Grammar strings are like "HR/Ncfsa" – the part after the slash is the noun type.
        # We split on '/' and look at the first token after possible H* prefix.
        # Example: "HR/Ncfsa" -> "Ncfsa" -> starts with "N" => common noun.
        # Example: "HNpm/Sp3ms" -> "Npm" -> starts with "Np" => proper noun.
        # Simplify: we inspect the first letter after optional leading 'H' and any following letters until a non‑letter.
        gram = grammar_prefix.split('/')[-1]  # take the noun‑type part
        # Strip leading H if present
        if gram.startswith('H'):
            gram = gram[1:]
        # Identify the noun category
        expected_pos = None
        if gram.startswith('Np'):
            expected_pos = 'Np'
        elif gram.startswith('Ng'):
            expected_pos = 'Ng'
        elif gram.startswith('N'):
            expected_pos = 'N'
        elif gram.startswith('V'):
            expected_pos = 'V'
        # Find a matching entry
        for e in entries:
            if expected_pos and e.pos == expected_pos:
                return e
        # Fallback – return the first entry
        return entries[0]

# Helper for quick loading (singleton pattern)
_lexical_index_instance: LexicalIndex | None = None

def get_lexical_index() -> LexicalIndex:
    global _lexical_index_instance
    if _lexical_index_instance is None:
        _lexical_index_instance = LexicalIndex(Path(__file__).parents[1] / "resources" / "LexicalIndex.xml")
    return _lexical_index_instance
