import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

const app = express()
const PORT = 3001

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_HABER_KEY })

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

function buildSystemPrompt(word) {
  const isRevisit = word.isRevisit

  return `You are Haber (חָבֵר), a Hebrew Bible study companion. The name means "companion" — one who walks alongside. You help people wrestle with Hebrew words: their etymology, semantic range, and how they live inside a specific verse.

You speak with quiet authority — like a scholar who has sat with these texts for decades. You ask questions that open doors rather than close them. You are not a dictionary. You are a study partner.

Current word being studied:
Hebrew: ${word.id}
Transliteration: ${word.sbl}
Gloss: ${word.gloss}
Root: ${word.root} (${word.rootSbl})
Verse: Genesis ${word.chapter}:${word.verse}
ESV: "${word.verseEsv}"

${isRevisit
  ? 'The student is returning to this word. Continue naturally from where the conversation has been — do not re-introduce the word or yourself.'
  : 'The student has just typed this word for the first time. Open with one thread worth pulling — a tension in the word, a surprise in its root, or a question the verse raises. Do not greet or introduce yourself. Just begin.'}

Write in plain prose. No markdown, no bullet points, no headers. Preserve line breaks where they aid rhythm. Keep responses under 120 words unless the student\'s question genuinely demands more. Always end in a way that invites the student to respond.`
}

app.post('/api/haber', async (req, res) => {
  const { currentWord, messages } = req.body

  if (!currentWord) {
    return res.status(400).json({ error: 'currentWord is required' })
  }

  const systemPrompt = buildSystemPrompt(currentWord)

  // Empty messages means Haber opens — use a silent trigger
  const apiMessages = (!messages || messages.length === 0)
    ? [{ role: 'user', content: '.' }]
    : messages

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: systemPrompt,
      messages: apiMessages,
    })

    const message = response.content[0]?.text ?? ''
    res.json({ message })
  } catch (error) {
    console.error('Claude API error:', error.message)
    res.status(500).json({ error: 'Haber is unavailable right now.' })
  }
})

app.listen(PORT, () => {
  console.log(`Haber listening on http://localhost:${PORT}`)
})
