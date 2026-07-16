import { useState, useCallback } from 'react'

const LS_KEY = 'portfolio_access_token'

export function getStoredToken(): string {
  try { return localStorage.getItem(LS_KEY) || '' } catch { return '' }
}

export function setStoredToken(t: string) {
  try { localStorage.setItem(LS_KEY, t) } catch { /* ignore */ }
}

export function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getStoredToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {}),
  }
  if (token) headers['x-portfolio-token'] = token
  return fetch(url, { ...init, headers })
}

export function useToken() {
  const [token, setTokenState] = useState<string>(() => getStoredToken())
  const [showPrompt, setShowPrompt] = useState<boolean>(() => !getStoredToken())

  const saveToken = useCallback((t: string) => {
    const trimmed = t.trim()
    setStoredToken(trimmed)
    setTokenState(trimmed)
    setShowPrompt(false)
  }, [])

  const clearToken = useCallback(() => {
    setStoredToken('')
    setTokenState('')
    setShowPrompt(true)
  }, [])

  return { token, showPrompt, saveToken, clearToken }
}
