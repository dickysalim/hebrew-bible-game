import xml.etree.ElementTree as ET
from collections import defaultdict

NS = "http://openscriptures.github.com/morphhb/namespace"

# --- Parse BDB ---
print("Parsing BDB...")
bdb_tree = ET.parse("scripts/resources/BrownDriverBriggs.xml")
bdb_root_elem = bdb_tree.getroot()

# Build: section_id -> list of entry_ids in that section
section_entries = defaultdict(list)
entry_type_map  = {}  # entry_id -> "root" or "non-root"

for section in bdb_root_elem.iter(f"{{{NS}}}section"):
    sid = section.get("id")
    for entry in section.findall(f"{{{NS}}}entry"):
        eid = entry.get("id")
        if eid:
            section_entries[sid].append(eid)
            entry_type_map[eid] = "root" if entry.get("type") == "root" else "non-root"

# Derive single/main/sub from BDB structure
def bdb_classify(bdb_id):
    if bdb_id not in entry_type_map:
        return "unknown"
    if entry_type_map[bdb_id] == "non-root":
        return "sub"
    # It's a root — check if section has siblings
    # Find which section this entry belongs to
    # section id = first two parts of entry id (e.g. "a.ab" from "a.ab.aa")
    parts = bdb_id.rsplit(".", 1)
    section_id = parts[0]
    count = len(section_entries.get(section_id, []))
    return "single" if count == 1 else "main"

# --- Parse LexicalIndex ---
print("Parsing LexicalIndex...")
li_tree = ET.parse("scripts/resources/LexicalIndex.xml")
li_root_elem = li_tree.getroot()

results = {"match": 0, "mismatch": []}
bdb_only = {"single": 0, "main": 0, "sub": 0, "unknown": 0}

for entry in li_root_elem.iter(f"{{{NS}}}entry"):
    entry_id = entry.get("id")
    etym = entry.find(f"{{{NS}}}etym")
    if etym is None:
        continue
    li_type = etym.get("type")  # main, sub, single
    if li_type not in ("main", "sub", "single"):
        continue

    xref = entry.find(f"{{{NS}}}xref")
    if xref is None:
        continue
    bdb_id = xref.get("bdb")
    if not bdb_id:
        continue

    bdb_type = bdb_classify(bdb_id)
    bdb_only[bdb_type] = bdb_only.get(bdb_type, 0) + 1

    w = entry.find(f"{{{NS}}}w")
    word = w.text if w is not None else "?"

    if li_type == bdb_type:
        results["match"] += 1
    else:
        results["mismatch"].append({
            "li_id": entry_id, "bdb_id": bdb_id,
            "word": word, "li": li_type, "bdb": bdb_type
        })

total = results["match"] + len(results["mismatch"])
print(f"\n  Total compared: {total}")
print(f"  ✅ Match:    {results['match']} ({results['match']/total*100:.1f}%)")
print(f"  ❌ Mismatch: {len(results['mismatch'])} ({len(results['mismatch'])/total*100:.1f}%)")

print("\nBDB-derived classification distribution:")
for k, v in bdb_only.items():
    print(f"  {k}: {v}")

# Show mismatch breakdown
from collections import Counter
breakdown = Counter(f"LI={m['li']} BDB={m['bdb']}" for m in results["mismatch"])
print("\nMismatch breakdown:")
for k, v in breakdown.most_common():
    print(f"  {k}: {v} cases")

print("\nSample mismatches:")
print(f"{'LI_ID':<8} {'BDB_ID':<14} {'Word':<22} {'LI':<8} {'BDB'}")
print("-" * 65)
for m in results["mismatch"][:20]:
    print(f"{m['li_id']:<8} {m['bdb_id']:<14} {m['word']:<22} {m['li']:<8} {m['bdb']}")
