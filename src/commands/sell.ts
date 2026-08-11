import { Message } from "discord.js";
import { Command, CommandError } from "./command";
import { prisma, ensureUser, createLedgerEntry, lockUserById, lockInventoryByUserId } from "../prisma";
import { getItemSellValue, isValidItem, getItemDisplayName } from "./items";
import { parseBigInt, parsePositiveInteger, serializeInventory } from "./utils";

export const sellCommand: Command = {
  data: { name: "sell", description: "Sell items from your inventory for cowoncy." },
  cooldownSeconds: 5,
  async execute(message: Message, args: string[]) {
    if (args.length < 2) throw new CommandError("INVALID_SELL", "Use `owo sell <item> <amount>`.");
    const amount = parsePositiveInteger(args[args.length - 1], "Amount");
    const item = args.slice(0, -1).join(" ").toLowerCase();
    if (!isValidItem(item)) throw new CommandError("INVALID_ITEM", "That item cannot be sold.");

    const user = await ensureUser(message.author.id);
    const result = await prisma.$transaction(async (tx) => {
      const lockedUser = await lockUserById(tx, user.id);
      const inventoryRow = await lockInventoryByUserId(tx, user.id);
      if (!lockedUser || !inventoryRow) throw new CommandError("INSUFFICIENT_ITEMS", "You do not have that item.");

      const items = (inventoryRow.items as Record<string, number>) ?? {};
      if ((items[item] ?? 0) < amount) throw new CommandError("INSUFFICIENT_ITEMS", `You do not have ${amount}x ${getItemDisplayName(item)}.`);
      const sellPrice = BigInt(getItemSellValue(item) * amount);
      const balanceBefore = parseBigInt(lockedUser.cowoncy);
      const balanceAfter = balanceBefore + sellPrice;
      await tx.inventory.update({ where: { id: inventoryRow.id }, data: { items: serializeInventory({ ...items, [item]: items[item] - amount }) } });
      await tx.user.update({ where: { id: user.id }, data: { cowoncy: balanceAfter } });
      await createLedgerEntry(tx, user.id, sellPrice, `Sold ${amount}x ${getItemDisplayName(item)}`, "SELL", balanceBefore, balanceAfter);
      return { amount, itemDisplay: getItemDisplayName(item), sellPrice, balanceAfter };
    });
    await message.reply(`Sold **${result.amount}x ${result.itemDisplay}** for **${result.sellPrice.toLocaleString()} cowoncy**. Balance: **${result.balanceAfter.toLocaleString()}**`);
  },
};