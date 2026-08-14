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

Install dependencies, build, and start the bot:

```bash
npm ci
npm run build
npm start
```

The start command applies pending Prisma migrations before logging the bot in. If the database already contains tables from an older setup without Prisma migration history, it automatically applies the safe ledger enum sync and records it as applied. No database reset is performed.

### Existing production database

Railway deployments handle this automatically through `npm start`. The migration only adds missing enum values such as `GAMBLING`; it does not drop or recreate tables. Do not run `prisma migrate reset` against the production database.

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