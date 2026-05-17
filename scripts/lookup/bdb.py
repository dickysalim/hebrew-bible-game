import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional, Dict, Any

NS = "http://openscriptures.github.com/morphhb/namespace"

class BDBEntry:
    def __init__(self, bdb_id: str, entry_type: str, status: str, defn: str, heb: str, xlit: Optional[str]):
        self.bdb_id = bdb_id
        self.entry_type = entry_type  # e.g., "section" or "entry"
        self.status = status
        self.defn = defn
        self.heb = heb
        self.xlit = xlit

    def as_dict(self) -> Dict[str, Any]:
        return {
            "bdb_id": self.bdb_id,
            "type": self.entry_type,
            "status": self.status,
            "def": self.defn,
            "heb": self.heb,
            "xlit": self.xlit,
        }

class BDB:
    def __init__(self, xml_path: str | Path):
        self.path = Path(xml_path)
        self.entries_by_id: Dict[str, BDBEntry] = {}
        self._load()

    def _load(self):
        tree = ET.parse(self.path)
        root = tree.getroot()
        for entry in root.iter(f"{{{NS}}}entry"):
            bdb_id = entry.get("id")
            entry_type = entry.tag.split('}')[-1]
            # Status is a child element: <status p="...">done|new|base|ref</status>
            status_el = entry.find(f"{{{NS}}}status")
            status = status_el.text.strip() if status_el is not None and status_el.text else ""
            # Definition — first try direct child, then search inside nested <sense> elements
            def_el = entry.find(f"{{{NS}}}def")
            if def_el is None:
                # Search recursively inside <sense> elements
                def_el = next(entry.iter(f"{{{NS}}}def"), None)
            defn = def_el.text if def_el is not None and def_el.text else ""
            # Hebrew word
            w_el = entry.find(f"{{{NS}}}w")
            heb = w_el.text if w_el is not None else ""
            xlit = w_el.get("xlit") if w_el is not None else None
            self.entries_by_id[bdb_id] = BDBEntry(bdb_id, entry_type, status, defn, heb, xlit)

    def get(self, bdb_id: str) -> Optional[BDBEntry]:
        return self.entries_by_id.get(bdb_id)

    def get_root_code(self, bdb_code: str) -> str:
        """Given a BDB code like ``n.fa.ab`` return the root code ``n.fa.aa``.
        The rule is: replace the final two characters with ``aa``.
        """
        parts = bdb_code.rsplit('.', 1)
        if len(parts) == 2:
            prefix, _ = parts
            return f"{prefix}.aa"
        return bdb_code  # fallback if format unexpected

# Singleton helper
_bdb_instance: BDB | None = None

def get_bdb() -> BDB:
    global _bdb_instance
    if _bdb_instance is None:
        _bdb_instance = BDB(Path(__file__).parents[1] / "resources" / "BrownDriverBriggs.xml")
    return _bdb_instance
