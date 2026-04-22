# TODO

## Market Comments

Add discussion threads to each market page so users have a reason to return after placing a trade.

**Why it matters:** Comments are the primary engagement loop in prediction markets — they surface information that moves probabilities, create a community space, and give users a reason to check in daily (not just when markets resolve).

**Rough spec:**
- Append-only comment feed per market (username, text, timestamp)
- Visible to all authenticated users, writable by any logged-in user
- Rendered below the trade activity feed on the market detail page
- No threading needed for v1 — flat list, newest at top

**DB changes needed:**
- New `comments` table: `id, market_id, user_id, body text, created_at`
- RLS: select by all, insert by authenticated users only
- Index on `market_id`

**Implementation:**
- Server action `postComment(marketId, body)` in `src/actions/`
- Add comment list + form to `src/app/market/[id]/page.tsx`
- Optimistic UI: show comment immediately on submit, revalidate in background
