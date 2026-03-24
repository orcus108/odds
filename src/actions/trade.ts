'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function executeTrade(marketId: string, position: string, amount: number) {
  if (!Number.isInteger(amount) || amount < 1) {
    return { error: 'Invalid amount' }
  }
  if (!position || typeof position !== 'string' || position.length === 0) {
    return { error: 'Invalid position' }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isBinary = position === 'yes' || position === 'no'

  let data, error
  if (isBinary) {
    ;({ data, error } = await supabase.rpc('execute_trade', {
      p_market_id: marketId,
      p_position: position,
      p_amount_oc: amount,
    }))
  } else {
    ;({ data, error } = await supabase.rpc('execute_multi_trade', {
      p_market_id: marketId,
      p_option_id: position,
      p_amount_oc: amount,
    }))
  }

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/market/${marketId}`)
  revalidatePath('/profile')
  revalidatePath('/')

  return { data }
}
