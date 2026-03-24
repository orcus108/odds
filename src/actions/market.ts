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

  const seedYes = parseInt(formData.get('seed_yes') as string) || 0
  const seedNo = parseInt(formData.get('seed_no') as string) || 0

  const { error } = await supabase.from('markets').insert({
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    resolution_criteria: formData.get('resolution_criteria') as string,
    category: formData.get('category') as string,
    closes_at: formData.get('closes_at') as string,
    yes_pool: seedYes,
    no_pool: seedNo,
    created_by: user.id,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/admin')
  redirect('/admin')
}

export async function closeMarket(marketId: string) {
  const supabase = await createClient()

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
