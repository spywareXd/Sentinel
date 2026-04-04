import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// This route handles email confirmation links and password reset
// redirects from Supabase. It exchanges the auth code for a session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/chat'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If there's no code or an error occurred, redirect to login with an error
  return NextResponse.redirect(`${origin}/login?message=Authentication failed. Please try again.`)
}
