import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_DOMAIN = '@smail.iitm.ac.in'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=no_email`)
  }

  if (!user.email.endsWith(ALLOWED_DOMAIN)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=domain`)
  }

  // Check if user has set a username
  const { data: userData } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single()

  if (!userData?.username) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  return NextResponse.redirect(`${origin}/`)
}
