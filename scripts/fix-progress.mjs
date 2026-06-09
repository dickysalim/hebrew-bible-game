/**
 * Fix progress script — run with: node scripts/fix-progress.mjs
 * 
 * Sets user progress to Genesis 7 (chapters 1-6 completed).
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zblcetagkazgjeuvjsfp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibGNldGFna2F6Z2pldXZqc2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NDc0NTAsImV4cCI6MjA5MjAyMzQ1MH0.zL8gP2q3NGsTCbHpQvnLnQI9le0pZX5nr8n0YA0lOOY'

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

// First, list all users
const { data: rows, error: listErr } = await sb.from('user_progress').select('user_id, typed_counts, updated_at')
if (listErr) {
  console.error('Failed to list users:', listErr)
  process.exit(1)
}

console.log(`Found ${rows.length} user(s):`)
rows.forEach(r => {
  const tc = r.typed_counts || {}
  console.log(`  user: ${r.user_id}`)
  console.log(`    v: ${tc.v || '?'}, stage: ${tc.currentStageIndex || '?'}, highest: ${tc.highestWordOrder || '?'}, updated: ${r.updated_at}`)
})

if (rows.length === 0) {
  console.log('\nNo users found. The Supabase RLS policy may be blocking reads with the anon key.')
  console.log('Please run this in the browser console instead (while logged in):')
  console.log(`
const { supabase } = await import('/src/lib/supabase.js');
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('user_progress').upsert({
  user_id: user.id,
  typed_counts: {
    v: 3, currentStageIndex: 7, highestWordOrder: 2120, currentWordOrder: 2121, typedChars: 0,
    settings: { showSBLWord: true, showSBLLetter: true, showGloss: true, showTAHOT: true, showNikud: false, expertMode: false },
    discoveredRoots: [], discoveredWordsByRoot: {}, alphabetProgress: {}, fcSettings: {},
  },
  updated_at: new Date().toISOString(),
}, { onConflict: 'user_id' });
sessionStorage.clear(); localStorage.removeItem('hebrew-bible-game-progress'); location.reload();
`)
}
