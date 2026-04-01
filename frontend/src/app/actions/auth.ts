'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const identifier = formData.get('identifier') as string
  const password = formData.get('password') as string

  // Determine if the identifier is an email or a username
  let email = identifier

  if (!identifier.includes('@')) {
    // It's a username — look up the associated email from profiles
    const { data: profile, error: lookupError } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', identifier)
      .single()

    if (lookupError || !profile?.email) {
      return { error: 'No account found with that username.' }
    }

    email = profile.email
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/chat')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    username: formData.get('username') as string,
    walletAddress: formData.get('walletAddress') as string,
  }

  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL ? 
    'http://localhost:3000' : 'http://localhost:3000'

  // Passing user_metadata is essential so a Supabase trigger can insert them to public.profiles
  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        username: data.username,
        wallet_address: data.walletAddress,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/login?message=Check your email to confirm your account')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `http://localhost:3000/auth/callback?next=/auth/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/login?message=Password reset link sent to your email')
}
