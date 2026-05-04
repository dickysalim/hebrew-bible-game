cat > /tmp/check-missing.mjs << 'EOF'
import { existsSync } from 'fs';

const BOOK_ORDER = [
  { name: 'genesis', chapters: 50 },
  { name: 'exodus', chapters: 40 },
  { name: 'leviticus', chapters: 27 },
  { name: 'numbers', chapters: 36 },
  { name: 'deuteronomy', chapters: 34 },
  { name: 'joshua', chapters: 24 },
  { name: 'judges', chapters: 21 },
  { name: 'ruth', chapters: 4 },
  { name: '1-samuel', chapters: 31 },
  { name: '2-samuel', chapters: 24 },
  { name: '1-kings', chapters: 22 },
  { name: '2-kings', chapters: 25 },
  { name: '1-chronicles', chapters: 29 },
  { name: '2-chronicles', chapters: 36 },
  { name: 'ezra', chapters: 10 },
  { name: 'nehemiah', chapters: 13 },
  { name: 'esther', chapters: 10 },
  { name: 'job', chapters: 42 },
  { name: 'psalms', chapters: 150 },
  { name: 'proverbs', chapters: 31 },
  { name: 'ecclesiastes', chapters: 12 },
  { name: 'song', chapters: 8 },
  { name: 'isaiah', chapters: 66 },
  { name: 'jeremiah', chapters: 52 },
  { name: 'lamentations', chapters: 5 },
  { name: 'ezekiel', chapters: 48 },
  { name: 'daniel', chapters: 12 },
  { name: 'hosea', chapters: 14 },
  { name: 'joel', chapters: 3 },
  { name: 'amos', chapters: 9 },
  { name: 'obadiah', chapters: 1 },
  { name: 'jonah', chapters: 4 },
  { name: 'micah', chapters: 7 },
  { name: 'nahum', chapters: 3 },
  { name: 'habakkuk', chapters: 3 },
  { name: 'zephaniah', chapters: 3 },
  { name: 'haggai', chapters: 2 },
  { name: 'zechariah', chapters: 14 },
  { name: 'malachi', chapters: 4 },
];

for (const book of BOOK_ORDER) {
  for (let c = 1; c <= book.chapters; c++) {
    const file = `src/data/verses/${book.name}-${c}.json`;
    if (!existsSync(file)) {
      console.log('MISSING:', file);
    }
  }
}
console.log('Check complete.');
EOF