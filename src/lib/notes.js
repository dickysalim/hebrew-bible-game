import { supabase } from './supabase'

// ─── Verse Notes ─────────────────────────────────────────────────────────────

/** Canonical cache key for a single verse note. */
export const noteKey = (book, chapter, verse) =>
  `${String(book).toLowerCase()}-${chapter}-${verse}`

/**
 * Load a single note for a specific verse.
 * Returns the HTML content string, or '' if no note exists.
 */
export async function loadNote(userId, book, chapter, verse) {
  if (!userId) return ''
  try {
    const { data, error } = await supabase
      .from('verse_notes')
      .select('content')
      .eq('user_id', userId)
      .eq('book', book)
      .eq('chapter', chapter)
      .eq('verse', verse)
      .single()
    if (error) {
      if (error.code === 'PGRST116') return '' // row not found
      console.error('[loadNote] Error:', error)
      return ''
    }
    return data?.content || ''
  } catch (err) {
    console.error('[loadNote] Exception:', err)
    return ''
  }
}

/**
 * Load ALL verse notes for a user in a single query.
 * Returns a flat map: { "genesis-1-1": "<html>", "genesis-1-5": "<html>" }
 */
export async function loadAllNotes(userId) {
  if (!userId) return {}
  try {
    const { data, error } = await supabase
      .from('verse_notes')
      .select('book, chapter, verse, content')
      .eq('user_id', userId)
    if (error) {
      console.error('[loadAllNotes] Error:', error)
      return {}
    }
    const map = {}
    for (const row of data ?? []) {
      map[noteKey(row.book, row.chapter, row.verse)] = row.content
    }
    return map
  } catch (err) {
    console.error('[loadAllNotes] Exception:', err)
    return {}
  }
}

/**
 * Upsert a verse note. Deletes the row if content is empty.
 */
export async function saveNote(userId, book, chapter, verse, content) {
  if (!userId) return false
  try {
    const isEmpty = !content || content.replace(/<[^>]*>/g, '').trim() === ''
    if (isEmpty) {
      await supabase
        .from('verse_notes')
        .delete()
        .eq('user_id', userId)
        .eq('book', book)
        .eq('chapter', chapter)
        .eq('verse', verse)
      return true
    }

    const { error } = await supabase
      .from('verse_notes')
      .upsert(
        {
          user_id: userId,
          book,
          chapter,
          verse,
          content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,book,chapter,verse' }
      )
    if (error) {
      console.error('[saveNote] Error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[saveNote] Exception:', err)
    return false
  }
}

// ─── Chapter Notes ────────────────────────────────────────────────────────────

/** Canonical cache key for a chapter note. */
export const chapterNoteKey = (book, chapter) =>
  `${String(book).toLowerCase()}-${chapter}`

/**
 * Load ALL chapter notes for a user in a single query.
 * Returns a flat map: { "genesis-1": "<html>", "genesis-2": "<html>" }
 */
export async function loadAllChapterNotes(userId) {
  if (!userId) return {}
  try {
    const { data, error } = await supabase
      .from('chapter_notes')
      .select('book, chapter, content')
      .eq('user_id', userId)
    if (error) {
      console.error('[loadAllChapterNotes] Error:', error)
      return {}
    }
    const map = {}
    for (const row of data ?? []) {
      map[chapterNoteKey(row.book, row.chapter)] = row.content
    }
    return map
  } catch (err) {
    console.error('[loadAllChapterNotes] Exception:', err)
    return {}
  }
}

/**
 * Upsert a chapter note. Deletes the row if content is empty.
 */
export async function saveChapterNote(userId, book, chapter, content) {
  if (!userId) return false
  try {
    const isEmpty = !content || content.replace(/<[^>]*>/g, '').trim() === ''
    if (isEmpty) {
      await supabase
        .from('chapter_notes')
        .delete()
        .eq('user_id', userId)
        .eq('book', String(book).toLowerCase())
        .eq('chapter', chapter)
      return true
    }

    const { error } = await supabase
      .from('chapter_notes')
      .upsert(
        {
          user_id: userId,
          book: String(book).toLowerCase(),
          chapter,
          content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,book,chapter' }
      )
    if (error) {
      console.error('[saveChapterNote] Error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[saveChapterNote] Exception:', err)
    return false
  }
}
