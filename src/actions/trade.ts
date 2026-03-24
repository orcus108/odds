'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function executeTrade(marketId: string, position: 'yes' | 'no', amount: number) {
  const supabase = await createClient()

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
