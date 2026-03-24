-- Add color column to market_options
-- Run this in the Supabase SQL Editor after multi_choice_migration.sql

alter table public.market_options
  add column color text not null default '#6366f1';
