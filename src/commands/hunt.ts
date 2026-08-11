import { Message } from "discord.js";
import { Command } from "./command";
import { prisma, TransactionClient, ensureUser, createLedgerEntry, lockUserById, lockInventoryByUserId } from "../prisma";
import { getRandomHuntItem, getShinyVariant, getItemDisplayName } from "./items";
import { parseBigInt, serializeInventory } from "./utils";

function rollShiny(pity: number) {
  return Math.random() < Math.min(0.8, 0.01 + 0.005 * pity);
}

export const huntCommand: Command = {
  data: { name: "hunt", description: "Hunt for owo creatures and gear." },
  cooldownSeconds: 10,
  async execute(message: Message) {
    const user = await ensureUser(message.author.id);
    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const lockedUser = await lockUserById(tx, user.id);
      if (!lockedUser) throw new Error("Unable to lock user account.");

      // Upsert and lock the inventory in the same transaction as the balance update.
      await tx.inventory.upsert({
        where: { userId: user.id },
        create: { userId: user.id, items: {} },
        update: {},
      });
      const inventoryRow = await lockInventoryByUserId(tx, user.id);
      if (!inventoryRow) throw new Error("Unable to lock user inventory.");

      const isShiny = rollShiny(Number(lockedUser.huntPity ?? 0));
      const baseItem = getRandomHuntItem();
      const itemKey = isShiny ? getShinyVariant(baseItem) ?? baseItem : baseItem;
      const itemDisplay = getItemDisplayName(itemKey);
      const reward = BigInt(40 + Math.floor(Math.random() * 90));
      const balanceBefore = parseBigInt(lockedUser.cowoncy);
      const balanceAfter = balanceBefore + reward;
      const newPity = isShiny ? 0 : Number(lockedUser.huntPity ?? 0) + 1;
      const currentItems = (inventoryRow.items as Record<string, number> | null) ?? {};
      const updatedItems = { ...currentItems, [itemKey]: (currentItems[itemKey] ?? 0) + 1 };

      await tx.user.update({ where: { id: user.id }, data: { cowoncy: balanceAfter, huntPity: newPity } });
      await tx.inventory.update({ where: { id: inventoryRow.id }, data: { items: serializeInventory(updatedItems) } });
      await createLedgerEntry(tx, user.id, reward, `Hunt reward for catching ${itemDisplay}`, "HUNT", balanceBefore, balanceAfter);

      return { itemDisplay, reward, isShiny, newBalance: balanceAfter, newPity };
    });

    await message.reply(
      `${result.isShiny ? `You found a **${result.itemDisplay}**!` : `You hunted a **${result.itemDisplay}**.`}\n` +
      `+${result.reward.toLocaleString()} cowoncy\nBalance: **${result.newBalance.toLocaleString()}**\nHunt pity: **${result.newPity}**`,
    );
  },
};