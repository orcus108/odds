'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createMarket(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.is_admin) redirect('/')

  const ALLOWED_CATEGORIES = ['Academics', 'Placements', 'Campus Life', 'Sports', 'Events', 'Other']
  const MAX_SEED = 1_000_000

  const title = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim()
  const resolution_criteria = (formData.get('resolution_criteria') as string)?.trim()
  const category = (formData.get('category') as string)?.trim()
  const closes_at = formData.get('closes_at') as string
  const seedYes = parseInt(formData.get('seed_yes') as string)
  const seedNo = parseInt(formData.get('seed_no') as string)

  if (!title || title.length > 200) throw new Error('Title must be 1–200 characters')
  if (!description || description.length > 2000) throw new Error('Description must be 1–2000 characters')
  if (!resolution_criteria || resolution_criteria.length > 2000) throw new Error('Resolution criteria must be 1–2000 characters')
  if (!ALLOWED_CATEGORIES.includes(category)) throw new Error('Invalid category')
  if (!closes_at || new Date(closes_at) <= new Date()) throw new Error('Closing date must be in the future')
  if (!Number.isInteger(seedYes) || seedYes < 1 || seedYes > MAX_SEED) throw new Error('Seed YES must be 1–1,000,000')
  if (!Number.isInteger(seedNo) || seedNo < 1 || seedNo > MAX_SEED) throw new Error('Seed NO must be 1–1,000,000')

  const { error } = await supabase.from('markets').insert({
    title,
    description,
    resolution_criteria,
    category,
    closes_at,
    yes_pool: seedYes,
    no_pool: seedNo,
    created_by: user.id,
  })

  if (error) throw new Error('Failed to create market')

  revalidatePath('/')
  revalidatePath('/admin')
  redirect('/admin')
}

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: userData } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!userData?.is_admin) redirect('/')
}

export async function closeMarket(marketId: string) {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { error } = await supabase
    .from('markets')
    .update({ status: 'closed' })
    .eq('id', marketId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidatePath(`/market/${marketId}`)
  return { success: true }
}

export async function resolveMarket(marketId: string, outcome: 'yes' | 'no') {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { error } = await supabase.rpc('resolve_market', {
    p_market_id: marketId,
    p_outcome: outcome,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidatePath(`/market/${marketId}`)
  revalidatePath('/leaderboard')
  return { success: true }
}
