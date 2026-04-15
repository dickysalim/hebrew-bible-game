# Root Explanations Implementation Plan

## Overview
Add "explanation" key to each root in `src/data/roots.json` with a two-paragraph explanation following the format used in `words.json`.

## Format Requirements
1. **First paragraph**: Concrete physical meaning and how it extends to spatial and tangible uses
2. **Second paragraph**: Abstract extensions into rank, time, quantity, and other figurative uses
3. **Show how many English words this single root replaces**
4. **Ground everything in BDB and Strong's references**
5. **No pictograph interpretation**
6. **Formatting**:
   - Hebrew words written with SBL transliteration in asterisks: `*ראש (rōš)*`
   - Important points marked with asterisks
   - Two paragraphs separated by `\n\n`

## Root List and Explanation Templates

### 1. ראש (rōš) - H7218
**Concrete**: Physical head of body, top/uppermost part of objects
**Abstract**: Beginning (time), chief (rank), first (priority), sum (quantity)
**English replacements**: head, beginning, chief, first, top, summit, capital, principal

### 2. ברא (bārāʾ) - H1254
**Concrete**: Divine creative act (no human subject in Qal)
**Abstract**: Creation ex nihilo, bringing into existence, forming something new
**English replacements**: create, make, form, produce, fashion

### 3. אלה (ʾĕlōah) - H433
**Concrete**: Mighty one, powerful being
**Abstract**: God, deity, divine being, object of worship
**English replacements**: God, deity, divine being, mighty one

### 4. ארץ (ʾereṣ) - H776
**Concrete**: Ground, soil, terrain
**Abstract**: Land (territory), earth (planet), country, world
**English replacements**: earth, land, ground, country, territory, world

### 5. שמי (šāmayim) - H8064
**Concrete**: Sky, visible heavens, atmospheric expanse
**Abstract**: Heaven (divine abode), celestial realm, spiritual domain
**English replacements**: heaven, sky, heavens, firmament, celestial

### 6. היה (hāyāh) - H1961
**Concrete**: To exist, to be present
**Abstract**: To become, to come to pass, to happen, state of being
**English replacements**: be, exist, become, happen, occur, come to pass

### 7. חשך (ḥōšeḵ) - H2822
**Concrete**: Absence of light, physical darkness
**Abstract**: Ignorance, calamity, evil, spiritual darkness
**English replacements**: darkness, obscurity, gloom, ignorance, calamity

### 8. רוח (rûaḥ) - H7307
**Concrete**: Wind, breath, air movement
**Abstract**: Spirit, life force, attitude, disposition
**English replacements**: spirit, wind, breath, air, mind, attitude

### 9. רחף (rāḥap̄) - H7363
**Concrete**: Bird hovering/fluttering over nest
**Abstract**: Divine presence hovering, protective oversight
**English replacements**: hover, flutter, brood over, move gently

### 10. הום (hûm) - H1949
**Concrete**: Roaring sound, surging water
**Abstract**: Tumult, confusion, chaotic noise
**English replacements**: roar, surge, make noise, be tumultuous

### 11. פנה (pānāh) - H6437
**Concrete**: Face, front part, surface
**Abstract**: Presence, attention, favor, turning toward
**English replacements**: face, presence, surface, turn, attention

### 12. אמר (ʾāmar) - H559
**Concrete**: To speak, to utter words
**Abstract**: To command, to declare, to think, to intend
**English replacements**: say, speak, tell, command, declare

### 13. אור (ʾôr) - H216
**Concrete**: Physical light, illumination
**Abstract**: Enlightenment, understanding, joy, salvation
**English replacements**: light, illumination, brightness, enlightenment

### 14. ראה (rāʾāh) - H7200
**Concrete**: To see with eyes, visual perception
**Abstract**: To understand, to perceive, to experience, to provide
**English replacements**: see, look, behold, perceive, understand

### 15. טוב (ṭôḇ) - H2896
**Concrete**: Good quality, pleasantness
**Abstract**: Moral goodness, beauty, benefit, righteousness
**English replacements**: good, pleasant, beautiful, beneficial, right

### 16. בדל (bādal) - H914
**Concrete**: To separate physically, to divide
**Abstract**: To distinguish, to set apart, to make holy
**English replacements**: separate, divide, distinguish, set apart

### 17. בין (bîn) - H995
**Concrete**: To discern, to perceive difference
**Abstract**: To understand, to have insight, to be wise
**English replacements**: understand, discern, perceive, have insight

### 18. קרא (qārāʾ) - H7121
**Concrete**: To call out, to summon
**Abstract**: To name, to proclaim, to read aloud, to invite
**English replacements**: call, cry, proclaim, name, read, invite

### 19. ערב (ʿereḇ) - H6153
**Concrete**: Evening, dusk, sunset
**Abstract**: End of day, transition, mixing (from related root)
**English replacements**: evening, dusk, nightfall, mix, pledge

### 20. בקר (bōqer) - H1242
**Concrete**: Morning, dawn, daybreak
**Abstract**: Beginning, examination, seeking (from verbal root)
**English replacements**: morning, dawn, daybreak, examine, seek

### 21. אחד (ʾeḥāḏ) - H259
**Concrete**: Single unit, one item
**Abstract**: Unity, uniqueness, alone, first
**English replacements**: one, single, alone, unique, first

## Implementation Steps
1. Create detailed explanations for each root following the template
2. Ensure each explanation has exactly two paragraphs separated by `\n\n`
3. Include BDB and Strong's references in each explanation
4. Count and mention English word replacements
5. Format with proper SBL notation and asterisks
6. Update `roots.json` with new "explanation" field for each root
7. Validate formatting matches `words.json` pattern

## Quality Checks
- [ ] All 21 roots have explanations
- [ ] Each explanation has two paragraphs
- [ ] BDB and Strong's references included
- [ ] English word count mentioned
- [ ] Proper SBL formatting with asterisks
- [ ] No pictograph interpretation
- [ ] Concrete and abstract meanings clearly distinguished