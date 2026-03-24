'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function executeTrade(marketId: string, position: 'yes' | 'no', amount: number) {
  if (!Number.isInteger(amount) || amount < 1) {
    return { error: 'Invalid amount' }
  }
  if (position !== 'yes' && position !== 'no') {
    return { error: 'Invalid position' }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase.rpc('execute_trade', {
    p_market_id: marketId,
    p_position: position,
    p_amount_oc: amount,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/market/${marketId}`)
  revalidatePath('/profile')
  revalidatePath('/')

  return { data }
}
