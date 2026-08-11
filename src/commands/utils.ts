import { TransactionClient } from "../prisma";
import { itemDefinitions } from "./items";
import { CommandError } from "./command";

export function parseBigInt(value: string | number | bigint | null) {
  if (value === null) return 0n;
  if (typeof value === "bigint") return value;
  return BigInt(value);
}

export function parsePositiveInteger(value: string | undefined, label: string) {
  if (!value || !/^\d+$/.test(value) || Number(value) <= 0 || !Number.isSafeInteger(Number(value))) {
    throw new CommandError("INVALID_AMOUNT", `${label} must be a positive whole number.`);
  }
  return Number(value);
}

export function serializeInventory(items: Record<string, number>) {
  return Object.entries(items)
    .filter(([, amount]) => amount > 0)
    .reduce<Record<string, number>>((acc, [item, amount]) => {
      acc[item] = amount;
      return acc;
    }, {});
}

export function buildInventorySummary(items: Record<string, number>) {
  const lines = Object.entries(items)
    .filter(([, amount]) => amount > 0)
    .map(([item, amount]) => {
      const display = itemDefinitions[item]?.display ?? item;
      return `${display}: ${amount}`;
    });
  return lines.length > 0 ? lines.join("\n") : "Empty inventory.";
}

export async function loadOrCreateInventory(tx: TransactionClient, userId: string) {
  const existing = await tx.inventory.findUnique({ where: { userId } });
  if (existing) return existing;
  return tx.inventory.create({ data: { userId, items: {} } });
}
