# owo-bot

An OwO-style Discord economy bot built with TypeScript, Discord.js, Prisma, and PostgreSQL.

## Overview

Hunt creatures, earn cowoncy, trade with friends, and play a collection of gambling games. The bot is designed to be self-hosted with a straightforward TypeScript and Prisma setup.

## Stack

- Node.js 24+
- TypeScript
- Discord.js
- Prisma ORM
- PostgreSQL

## Repository layout

```text
.
├── prisma/              # Database schema and migrations
├── src/                 # Discord commands, services, and middleware
├── .env.example         # Required environment variables
├── .nvmrc               # Pinned Node.js major version
├── package.json         # Scripts and dependencies
├── README.md            # Setup and command reference
└── tsconfig.json        # TypeScript configuration
```

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

## Features

- **Hunt** — Spend currency, catch creatures, roll for shinies, and use the pity system.
- **Sell** — Turn creatures into cowoncy.
- **Daily** — Claim daily rewards with streak bonuses.
- **Gambling** — Slots, coinflip, blackjack, lottery, highlow, mines, and snailgarden.
- **Give** — Transfer cowoncy to friends.
- **Prefix commands** — Use `owo <command>`. Admin grants use `!addmoney <amount> <@user>`.

## Commands

| Command | What it does |
| --- | --- |
| `owo cowoncy` | Check your balance |
| `owo daily` | Claim a daily reward |
| `owo give @user 100` | Transfer cowoncy |
| `owo hunt` | Catch creatures |
| `owo sell <creature>` | Sell creatures |
| `owo inventory` | View your inventory |
| `owo slots` | Play slots |
| `owo coinflip` | Play coinflip |
| `owo blackjack` | Play blackjack |
| `owo lottery` | Buy lottery tickets |
| `owo highlow` | Guess higher or lower |
| `owo mines` | Play mines |
| `owo snailgarden` | Grow snails |

## Configuration

Copy `.env.example` to `.env` and set:

```env
DISCORD_TOKEN=your-discord-bot-token
DISCORD_CLIENT_ID=your-discord-application-client-id
DATABASE_URL=postgresql://user:password@localhost:5432/owo_claude
```

## License

MIT. See [LICENSE](LICENSE).