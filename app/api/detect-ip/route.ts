import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Try to get IP from common headers set by reverse proxies / Vercel / Netlify
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  let ip = forwarded?.split(',')[0]?.trim() || realIp || null

  // If running locally / behind proxy that doesn't set headers, fall back to external service
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    try {
      const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) })
      const data = await res.json()
      ip = data.ip
    } catch {
      // Silent fallback — will return empty
    }
  }

  return NextResponse.json({ ip: ip || '' })
}
