export type MarketStatus = 'open' | 'closed' | 'resolved'
export type MarketType = 'binary' | 'multi'
export type Position = string  // 'yes' | 'no' for binary; option UUID for multi
export type MarketOutcome = string | null  // 'yes' | 'no' for binary; option UUID for multi

export type Category = string

export interface User {
  id: string
  email: string
  username: string | null
  avatar_url: string | null
  balance_oc: number
  is_admin: boolean
  created_at: string
}

export interface MarketOption {
  id: string
  market_id: string
  label: string
  pool: number
  ord: number
}

export interface Market {
  id: string
  title: string
  description: string | null
  resolution_criteria: string | null
  category: Category
  market_type: MarketType
  yes_pool: number
  no_pool: number
  status: MarketStatus
  outcome: MarketOutcome
  created_by: string | null
  closes_at: string
  created_at: string
}

export interface Trade {
  id: string
  user_id: string
  market_id: string
  position: Position
  amount_oc: number
  shares: number
  created_at: string
}

export interface TradeWithUser extends Trade {
  users: { username: string | null }
}

export interface Payout {
  id: string
  user_id: string
  market_id: string
  amount_oc: number
  created_at: string
}
