---
name: Repository layout direction
description: The bot should keep its conventional Prisma structure while presenting a clean, focused GitHub repository.
---

Keep the bot organized around `src/`, `prisma/`, `.env.example`, pinned Node tooling, package scripts, and clear documentation. Do not switch ORM libraries or move Prisma migrations solely to resemble another repository.

**Why:** The user chose a cleaner GitHub presentation but explicitly preferred keeping the working Prisma architecture; a cosmetic ORM migration would add risk without user value.

**How to apply:** Preserve Prisma conventions for future schema and migration work, and focus repository cleanup on documentation, generated-file hygiene, version pinning, and scripts.