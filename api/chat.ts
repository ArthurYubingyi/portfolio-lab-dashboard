import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const accessToken = process.env.PORTFOLIO_ACCESS_TOKEN
  if (accessToken) {
    const provided = req.headers['x-portfolio-token']
    if (provided !== accessToken) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured' })
  }

  try {
    const { system, messages, max_tokens, ...rest } = req.body as {
      system?: string
      messages: { role: string; content: string }[]
      max_tokens?: number
      [key: string]: unknown
    }

    // OpenAI format: prepend system message if provided
    const fullMessages = system
      ? [{ role: 'system', content: system }, ...messages]
      : messages

    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: fullMessages,
        max_tokens: max_tokens ?? 4096,
        ...rest,
      }),
    })

    const data = await upstream.json()
    return res.status(upstream.status).json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return res.status(500).json({ error: msg })
  }
}
