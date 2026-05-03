import { supabase } from './supabase'

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
 * Load ALL notes for a user in a single query.
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
 * Upsert a note for a specific verse.
 * If content is empty (whitespace / empty tags only), deletes the row to keep the table clean.
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
