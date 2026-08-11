import { PrismaClient, Prisma, LedgerType } from "@prisma/client";

export const prisma = new PrismaClient();
export type TransactionClient = Prisma.TransactionClient;

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
