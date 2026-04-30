export function useMobileKeyboard(dispatch) {
  const handleKey = (heb) => {
    dispatch({ type: 'TYPE', heb })
  }

  const handleSpace = () => {
    dispatch({ type: 'SPACE' })
  }

  return { handleKey, handleSpace }
}
