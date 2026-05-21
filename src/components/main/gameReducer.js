export function findWord(verses, wordOrder) {
  for (const v of verses) {
    for (const w of v.words) {
      if (w.word_order === wordOrder) return w
    }
  }
  return null
}

export function findVerseIndex(verses, wordOrder) {
  return verses.findIndex(v => v.words.some(w => w.word_order === wordOrder))
}

export function isWordDone(wordOrder, highestWordOrder) {
  return wordOrder <= highestWordOrder
}

export function isVerseDone(verse, highestWordOrder) {
  return verse.words.every(w => w.word_order <= highestWordOrder)
}

export function firstIncompleteInVerse(verse, highestWordOrder) {
  const word = verse.words.find(w => w.word_order > highestWordOrder)
  return word ? word.word_order : -1
}

export function createInitialState() {
  return {
    currentStageIndex: 1,
    highestWordOrder: 0,
    currentWordOrder: 1,
    typedChars: 0,

    wordEncounters: {},
    errorCount: 0,
    wrongHebKeys: [],
    completedWordSignal: 0,
    lastCompletedWordId: null,
    typingSignal: 0,
    recentTypedLetter: null,
    chapterEndSignal: 0,
    prevChapterSignal: 0,

    showSBLWord: true,
    showSBLLetter: true,
    showGloss: true,
    showTAHOT: true,
    showNikud: false,
    expertMode: false,
  }
}

export const initialState = createInitialState()

function findNextWordOrder(verses, currentWordOrder) {
  let found = false
  for (const v of verses) {
    for (const w of v.words) {
      if (found) return w.word_order
      if (w.word_order === currentWordOrder) found = true
    }
  }
  return null
}

function lastWordOrderInChapter(verses) {
  if (verses.length === 0) return null
  const lastVerse = verses[verses.length - 1]
  if (!lastVerse.words.length) return null
  return lastVerse.words[lastVerse.words.length - 1].word_order
}

export function reducer(state, action) {
  switch (action.type) {

    case 'TYPE': {
      const { heb, verses } = action
      const word = findWord(verses, state.currentWordOrder)
      if (!word) return state

      const target = word.heb_consonant[state.typedChars]
      if (target === undefined) return state

      if (heb === target) {
        const newTypedChars = state.typedChars + 1
        const wordDone = newTypedChars === word.heb_consonant.length

        let newWordEncounters = state.wordEncounters
        let newHighest = state.highestWordOrder
        if (wordDone) {
          newHighest = Math.max(state.highestWordOrder, state.currentWordOrder)
          const count = state.wordEncounters[word.heb_consonant] || 0
          newWordEncounters = { ...state.wordEncounters, [word.heb_consonant]: count + 1 }
        }

        return {
          ...state,
          typedChars: newTypedChars,
          highestWordOrder: newHighest,
          wordEncounters: newWordEncounters,
          errorCount: wordDone ? 0 : state.errorCount,
          wrongHebKeys: wordDone ? [] : state.wrongHebKeys,
          completedWordSignal: wordDone ? state.completedWordSignal + 1 : state.completedWordSignal,
          lastCompletedWordId: wordDone ? word.heb_consonant : state.lastCompletedWordId,
          typingSignal: state.typingSignal + 1,
          recentTypedLetter: heb,
        }
      }

      const newWrong = state.wrongHebKeys.includes(heb)
        ? state.wrongHebKeys
        : [...state.wrongHebKeys, heb]
      return { ...state, errorCount: state.errorCount + 1, wrongHebKeys: newWrong }
    }

    case 'SPACE': {
      const { verses } = action
      const word = findWord(verses, state.currentWordOrder)
      if (!word) return state

      if (state.currentWordOrder > state.highestWordOrder) return state

      const next = findNextWordOrder(verses, state.currentWordOrder)
      if (next !== null) {
        return { ...state, currentWordOrder: next, typedChars: 0, errorCount: 0, wrongHebKeys: [] }
      }

      const lastWo = lastWordOrderInChapter(verses)
      if (lastWo !== null && state.currentWordOrder === lastWo && isWordDone(lastWo, state.highestWordOrder)) {
        return { ...state, chapterEndSignal: state.chapterEndSignal + 1 }
      }

      return state
    }

    case 'MOVE_VERSE': {
      const { dir, verses } = action
      const vi = findVerseIndex(verses, state.currentWordOrder)
      if (vi === -1) return state

      const targetVi = vi + dir

      if (targetVi < 0) {
        return { ...state, prevChapterSignal: state.prevChapterSignal + 1 }
      }

      if (targetVi >= verses.length) {
        if (isVerseDone(verses[vi], state.highestWordOrder)) {
          return { ...state, chapterEndSignal: state.chapterEndSignal + 1 }
        }
        return state
      }

      const targetVerse = verses[targetVi]
      const incomplete = firstIncompleteInVerse(targetVerse, state.highestWordOrder)
      const landWord = incomplete !== -1
        ? incomplete
        : targetVerse.words[0].word_order

      return { ...state, currentWordOrder: landWord, typedChars: 0, errorCount: 0, wrongHebKeys: [] }
    }

    case 'LOAD_CHAPTER':
    case 'JUMP_TO_STAGE': {
      const { targetStageIndex, targetFirstWordOrder } = action
      let landWord = targetFirstWordOrder
      if (state.highestWordOrder >= targetFirstWordOrder) {
        landWord = state.highestWordOrder + 1
      }

      return {
        ...state,
        currentStageIndex: targetStageIndex,
        currentWordOrder: landWord,
        typedChars: 0,
        errorCount: 0,
        wrongHebKeys: [],
      }
    }

    case 'INIT_FROM_CACHE': {
      const c = action.cached || {}
      return {
        ...state,
        highestWordOrder: c.highestWordOrder ?? 0,
        currentStageIndex: c.currentStageIndex ?? 1,
        currentWordOrder: c.currentWordOrder ?? 1,
        typedChars: c.typedChars ?? 0,
      }
    }

    case 'TOGGLE_SBL_WORD':
      return { ...state, showSBLWord: !state.showSBLWord }

    case 'TOGGLE_SBL_LETTER':
      return { ...state, showSBLLetter: !state.showSBLLetter }

    case 'TOGGLE_GLOSS':
      return { ...state, showGloss: !state.showGloss }

    case 'TOGGLE_TAHOT':
      return { ...state, showTAHOT: !state.showTAHOT }

    case 'TOGGLE_EXPERT_MODE':
      return { ...state, expertMode: !state.expertMode }

    case 'TOGGLE_NIKUD':
      return { ...state, showNikud: !state.showNikud }

    default: return state
  }
}
