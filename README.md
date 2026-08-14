# `owo-bot`

> **Yes, it's a clone. No, you don't have to pay for premium. Free money. Free gambling. Free everything. 💰**

---

## What Is This?

It's an **OwO Bot clone** — same games, same grind, same gambling addiction — but **completely free**. No pay-to-win. No premium currency. No "wait 24 hours or pay $5." Just raw, unfiltered, degenerate gambling.

Hunt creatures. Sell them for currency. Gamble it all away. Repeat.

---

## Setup

Install dependencies, apply the Prisma migrations to the database, and then start the bot:

```bash
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build
npm start
```

The migration step is required after pulling schema changes. In particular, it adds the ledger enum values used by the gambling commands.

### Existing production database

If `npm run prisma:migrate:deploy` reports `P3005` because the database already contains tables, apply this additive migration directly once, then record it as applied:

```bash
npx prisma db execute --schema=prisma/schema.prisma --file=prisma/migrations/20260814180000_sync_ledger_type/migration.sql
npx prisma migrate resolve --applied 20260814180000_sync_ledger_type
npm run prisma:migrate:deploy
```

This does not drop or recreate any tables. Do not run `prisma migrate reset` against the production database.

---

## Features

- **Hunt** — Spend currency, catch creatures, roll for shinies, pity system so you don't go 0/1000
- **Sell** — Turn creatures into cold hard cash
- **Daily** — Free money every day. Streak bonus if you're consistent.
- **Gambling** — 7 ways to lose it all:
  - `slots` — pull the lever
  - `coinflip` — 50/50. No skill. Pure luck.
  - `blackjack` — "I can count cards" (you can't)
  - `lottery` — someone wins. Probably not you.
  - `highlow` — guess higher or lower. Wrong? Lose.
  - `mines` — click tiles. Don't hit a mine. Good luck.
  - `snailgarden` — grow snails. Yes, snails.
- **Give** — Gift currency to friends. Or enemies. We don't judge.
- **Prefix Commands** — Use `owo <cmd>` for bot commands. Admin grants use `!addmoney <amount> <@user>`.

---

## Commands

| Command | What It Does |
|---------|--------------|
| `owo cowoncy` | Check your balance |
| `owo daily` | Free money. Claim it. |
| `owo give @user 100` | Share the wealth |
| `owo hunt` | Catch creatures (costs money) |
| `owo sell <creature>` | Cash out |
| `owo inventory` | See what you own |
| `owo slots` | 🎰 |
| `owo coinflip` | 50/50. No skill. |
| `owo blackjack` | Try to beat the house (you won't) |
| `owo lottery` | Someone gets rich |
| `owo highlow` | Guess right or lose |
| `owo mines` | Don't click the boom |
| `owo snailgarden` | 🐌 |

---

# Feature Real OwO This Clone
Free to play ✅ ✅
Premium currency ❌ (costs $) ✅ (free)
Pay to win ❌ ✅ (no)
Gambling ✅ ✅ (more)
Dev takes your money ✅ ❌
Actually fun ✅ ✅ (debatable)

# License

MIT — free as in freedom and free as in free money.

---

Credits

Built because OwO Bot is great but paying for premium is cringe.
