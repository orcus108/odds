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

  const MAX_SEED = 1_000_000

  const title = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim()
  const resolution_criteria = (formData.get('resolution_criteria') as string)?.trim()
  const category = (formData.get('category') as string)?.trim()
  const closes_at = formData.get('closes_at') as string
  const market_type = (formData.get('market_type') as string) || 'binary'

  if (!title || title.length > 200) throw new Error('Title must be 1–200 characters')
  if (!description || description.length > 2000) throw new Error('Description must be 1–2000 characters')
  if (!resolution_criteria || resolution_criteria.length > 2000) throw new Error('Resolution criteria must be 1–2000 characters')
  if (!category || category.length > 50) throw new Error('Category must be 1–50 characters')
  if (!closes_at || new Date(closes_at) <= new Date()) throw new Error('Closing date must be in the future')
  if (market_type !== 'binary' && market_type !== 'multi') throw new Error('Invalid market type')

  if (market_type === 'binary') {
    const seedYes = parseInt(formData.get('seed_yes') as string)
    const seedNo = parseInt(formData.get('seed_no') as string)

    if (!Number.isInteger(seedYes) || seedYes < 1 || seedYes > MAX_SEED) throw new Error('Seed YES must be 1–1,000,000')
    if (!Number.isInteger(seedNo) || seedNo < 1 || seedNo > MAX_SEED) throw new Error('Seed NO must be 1–1,000,000')

    const { error } = await supabase.from('markets').insert({
      title,
      description,
      resolution_criteria,
      category,
      closes_at,
      market_type: 'binary',
      yes_pool: seedYes,
      no_pool: seedNo,
      created_by: user.id,
    })

    if (error) throw new Error('Failed to create market')
  } else {
    // Parse options: option_label_0, option_seed_0, option_label_1, ...
    const options: { label: string; seed: number; color: string }[] = []
    let i = 0
    while (formData.get(`option_label_${i}`) !== null) {
      const label = (formData.get(`option_label_${i}`) as string).trim()
      const seed = parseInt(formData.get(`option_seed_${i}`) as string)
      const color = (formData.get(`option_color_${i}`) as string)?.trim() || '#6366f1'
      if (!label || label.length > 100) throw new Error(`Option ${i + 1} label must be 1–100 characters`)
      if (!Number.isInteger(seed) || seed < 1 || seed > MAX_SEED) throw new Error(`Option ${i + 1} seed must be 1–1,000,000`)
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error(`Option ${i + 1} has an invalid color`)
      options.push({ label, seed, color })
      i++
    }

    if (options.length < 2) throw new Error('Multi-choice markets need at least 2 options')
    if (options.length > 20) throw new Error('Multi-choice markets can have at most 20 options')

    const { data: market, error: marketError } = await supabase
      .from('markets')
      .insert({
        title,
        description,
        resolution_criteria,
        category,
        closes_at,
        market_type: 'multi',
        yes_pool: 0,
        no_pool: 0,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (marketError || !market) throw new Error('Failed to create market')

    const { error: optionsError } = await supabase.from('market_options').insert(
      options.map((opt, idx) => ({
        market_id: market.id,
        label: opt.label,
        pool: opt.seed,
        color: opt.color,
        ord: idx,
      }))
    )

    if (optionsError) throw new Error('Failed to create market options')
  }

  revalidatePath('/')
  revalidatePath('/admin')
  redirect('/admin')
}

export async function proposeMarket(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim()
  const resolution_criteria = (formData.get('resolution_criteria') as string)?.trim()
  const category = (formData.get('category') as string)?.trim()
  const closes_at = formData.get('closes_at') as string
  const market_type = (formData.get('market_type') as string) || 'binary'

  if (!title || title.length > 200) throw new Error('Title must be 1–200 characters')
  if (!description || description.length > 2000) throw new Error('Description must be 1–2000 characters')
  if (!resolution_criteria || resolution_criteria.length > 2000) throw new Error('Resolution criteria must be 1–2000 characters')
  if (!category || category.length > 50) throw new Error('Category must be 1–50 characters')
  if (!closes_at || new Date(closes_at) <= new Date()) throw new Error('Closing date must be in the future')
  if (market_type !== 'binary' && market_type !== 'multi') throw new Error('Invalid market type')

  // Rate limit: 5 proposals per calendar day (UTC)
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('markets')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .gte('created_at', startOfDay.toISOString())
  if ((count ?? 0) >= 5) throw new Error('You can submit up to 5 proposals per day. Try again tomorrow.')

  if (market_type === 'binary') {
    const { error } = await supabase.from('markets').insert({
      title,
      description,
      resolution_criteria,
      category,
      closes_at,
      market_type: 'binary',
      status: 'pending',
      yes_pool: 0,
      no_pool: 0,
      created_by: user.id,
    })

    if (error) throw new Error('Failed to submit proposal')
  } else {
    const options: { label: string; color: string }[] = []
    let i = 0
    while (formData.get(`option_label_${i}`) !== null) {
      const label = (formData.get(`option_label_${i}`) as string).trim()
      const color = (formData.get(`option_color_${i}`) as string)?.trim() || '#6366f1'
      if (!label || label.length > 100) throw new Error(`Option ${i + 1} label must be 1–100 characters`)
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error(`Option ${i + 1} has an invalid color`)
      options.push({ label, color })
      i++
    }

    if (options.length < 2) throw new Error('Multi-choice markets need at least 2 options')
    if (options.length > 20) throw new Error('Multi-choice markets can have at most 20 options')

    const { data: market, error: marketError } = await supabase
      .from('markets')
      .insert({
        title,
        description,
        resolution_criteria,
        category,
        closes_at,
        market_type: 'multi',
        status: 'pending',
        yes_pool: 0,
        no_pool: 0,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (marketError || !market) throw new Error('Failed to submit proposal')

    const { error: optionsError } = await supabase.from('market_options').insert(
      options.map((opt, idx) => ({
        market_id: market.id,
        label: opt.label,
        pool: 0,
        color: opt.color,
        ord: idx,
      }))
    )

    if (optionsError) throw new Error('Failed to submit proposal options')
  }

  redirect('/propose?submitted=1')
}

export async function approveMarket(formData: FormData) {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const marketId = formData.get('market_id') as string
  const market_type = formData.get('market_type') as string
  const MAX_SEED = 1_000_000

  if (market_type === 'binary') {
    const seedYes = parseInt(formData.get('seed_yes') as string)
    const seedNo = parseInt(formData.get('seed_no') as string)

    if (!Number.isInteger(seedYes) || seedYes < 1 || seedYes > MAX_SEED) throw new Error('Seed YES must be 1–1,000,000')
    if (!Number.isInteger(seedNo) || seedNo < 1 || seedNo > MAX_SEED) throw new Error('Seed NO must be 1–1,000,000')

    const { error } = await supabase
      .from('markets')
      .update({ status: 'open', yes_pool: seedYes, no_pool: seedNo })
      .eq('id', marketId)
      .eq('status', 'pending')

    if (error) throw new Error('Failed to approve market')
  } else {
    const seeds: { id: string; pool: number }[] = []
    let i = 0
    while (formData.get(`option_id_${i}`) !== null) {
      const id = formData.get(`option_id_${i}`) as string
      const pool = parseInt(formData.get(`option_seed_${i}`) as string)
      if (!Number.isInteger(pool) || pool < 1 || pool > MAX_SEED) throw new Error(`Option ${i + 1} seed must be 1–1,000,000`)
      seeds.push({ id, pool })
      i++
    }

    for (const seed of seeds) {
      await supabase.from('market_options').update({ pool: seed.pool }).eq('id', seed.id)
    }

    const { error } = await supabase
      .from('markets')
      .update({ status: 'open' })
      .eq('id', marketId)
      .eq('status', 'pending')

    if (error) throw new Error('Failed to approve market')
  }

  revalidatePath('/')
  revalidatePath('/admin')
  redirect('/admin')
}

export async function rejectMarket(marketId: string) {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { error } = await supabase
    .from('markets')
    .delete()
    .eq('id', marketId)
    .eq('status', 'pending')

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

// _formData is required for the .bind(null, marketId) pattern in form actions
export async function withdrawProposal(marketId: string, _formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('markets')
    .delete()
    .eq('id', marketId)
    .eq('created_by', user.id)
    .eq('status', 'pending')

  if (error) throw new Error(error.message)

  revalidatePath('/profile')
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

export async function resolveMultiMarket(marketId: string, winningOptionId: string) {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { error } = await supabase.rpc('resolve_multi_market', {
    p_market_id: marketId,
    p_winning_option_id: winningOptionId,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidatePath(`/market/${marketId}`)
  revalidatePath('/leaderboard')
  return { success: true }
}
