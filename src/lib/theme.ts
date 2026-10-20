import { useSyncExternalStore } from 'react'

export type Theme = 'claro' | 'escuro'

const KEY = 'tio-preto-tema'
const listeners = new Set<() => void>()

const read = (): Theme => {
  try {
    return localStorage.getItem(KEY) === 'escuro' ? 'escuro' : 'claro'
  } catch {
    return 'claro'
  }
}

let theme: Theme = read()

/** O <html> carrega o tema: o CSS inteiro vem dele. */
function paint(t: Theme) {
  const el = document.documentElement
  if (t === 'escuro') el.setAttribute('data-theme', 'dark')
  else el.removeAttribute('data-theme')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'escuro' ? '#16110e' : '#f6f2ea')
}

export function setTheme(t: Theme) {
  theme = t
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* sem persistência: vale só nesta visita */
  }
  paint(t)
  listeners.forEach((l) => l())
}

export const toggleTheme = () => setTheme(theme === 'claro' ? 'escuro' : 'claro')

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => theme,
    () => 'claro' as Theme,
  )
}

paint(theme)
