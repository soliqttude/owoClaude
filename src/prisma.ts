import { PrismaClient, Prisma, LedgerType } from "@prisma/client";

export const prisma = new PrismaClient();
export type TransactionClient = Prisma.TransactionClient;

const LEDGER_TYPE_VALUES = [
  "GAMBLING",
  "GIFT_SENT",
  "GIFT_RECEIVED",
  "LOTTERY",
  "SLOTS",
  "COINFLIP",
  "BLACKJACK",
  "HIGHLOW",
  "MINES",
  "SNAILGARDEN",
  "AUTOHUNT_COST",
  "AUTOHUNT_REWARD",
  "BATTLE_REWARD",
  "QUEST_REWARD",
  "CHECKLIST_REWARD",
  "VOTE_REWARD",
  "SHOP_PURCHASE",
  "CRATE_PURCHASE",
  "ADMIN_ADJUSTMENT",
  "SACRIFICE",
  "HUNT_COST",
  "HUNT_SALE",
] as const;

/**
 * Repairs the additive LedgerType change for databases created before the
 * migration history was introduced. Every statement is idempotent, so this
 * can safely run whenever the bot starts.
 */
export async function ensureLedgerTypeValues() {
  await prisma.$connect();
  for (const value of LEDGER_TYPE_VALUES) {
    await prisma.$executeRawUnsafe(`ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS '${value}'`);
  }
}

export async function ensureUser(discordId: string) {
  return prisma.user.upsert({
    where: { discordId },
    create: { discordId },
    update: {},
  });
}

export async function ensureInventory(userId: string) {
  return prisma.inventory.upsert({
    where: { userId },
    create: { userId, items: {} },
    update: {},
  });
}

export async function lockUserById(tx: TransactionClient, userId: string) {
  const users = await tx.$queryRaw<Array<any>>`
    SELECT id, "discordId", cowoncy, "dailyClaimAt", "dailyStreak", lootboxes, "huntPity"
    FROM "User"
    WHERE id = ${userId}
    FOR UPDATE
  `;
  return users[0] ?? null;
}

export async function lockUserByDiscordId(tx: TransactionClient, discordId: string) {
  const users = await tx.$queryRaw<Array<any>>`
    SELECT id, "discordId", cowoncy, "dailyClaimAt", "dailyStreak", lootboxes, "huntPity"
    FROM "User"
    WHERE "discordId" = ${discordId}
    FOR UPDATE
  `;
  return users[0] ?? null;
}

export async function lockInventoryByUserId(tx: TransactionClient, userId: string) {
  const inventoryRows = await tx.$queryRaw<Array<any>>`
    SELECT id, "userId", items
    FROM "Inventory"
    WHERE "userId" = ${userId}
    FOR UPDATE
  `;
  return inventoryRows[0] ?? null;
}

export async function createLedgerEntry(
  tx: TransactionClient,
  userId: string,
  amount: bigint,
  reason: string,
  type: LedgerType,
  balanceBefore: bigint,
  balanceAfter: bigint,
) {
  return tx.ledger.create({
    data: {
      userId,
      amount,
      reason,
      type,
      balanceBefore,
      balanceAfter,
    },
  });
}
