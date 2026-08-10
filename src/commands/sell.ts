import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./command";
import { prisma, ensureUser, createLedgerEntry, lockUserById, lockInventoryByUserId } from "../prisma";
import { getItemSellValue, isValidItem, getItemDisplayName } from "./items";
import { parseBigInt, serializeInventory } from "./utils";

export const sellCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("sell")
    .setDescription("Sell items from your inventory for cowoncy.")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("Item name to sell")
        .setRequired(true)
        .addChoices(
          { name: "Fish", value: "fish" },
          { name: "Fox", value: "fox" },
          { name: "Bunny", value: "bunny" },
          { name: "Dragon", value: "dragon" },
          { name: "Cloud", value: "cloud" },
          { name: "✨ Shiny Fish", value: "shiny fish" },
          { name: "✨ Shiny Fox", value: "shiny fox" },
          { name: "✨ Shiny Bunny", value: "shiny bunny" },
          { name: "✨ Shiny Dragon", value: "shiny dragon" },
          { name: "✨ Shiny Cloud", value: "shiny cloud" },
        ),
    )
    .addIntegerOption((option) => option.setName("amount").setDescription("Amount to sell").setRequired(true).setMinValue(1)),
  cooldownSeconds: 5,
  async execute(interaction: ChatInputCommandInteraction) {
    const item = interaction.options.getString("item", true);
    const amount = interaction.options.getInteger("amount", true);
    if (!isValidItem(item)) {
      await interaction.reply({ content: "That item cannot be sold.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const user = await ensureUser(interaction.user.id);

    const result = await prisma.$transaction(async (tx) => {
      const lockedUser = await lockUserById(tx, user.id);
      const inventoryRow = await lockInventoryByUserId(tx, user.id);
      if (!lockedUser || !inventoryRow) throw new Error("Unable to lock user inventory.");

      const items = inventoryRow.items as Record<string, number>;
      const currentItemCount = items[item] ?? 0;
      if (currentItemCount < amount) {
        throw new Error("INSUFFICIENT_ITEMS");
      }

      const sellPrice = BigInt(getItemSellValue(item) * amount);
      const oldBalance = parseBigInt(lockedUser.cowoncy);
      const newBalance = oldBalance + sellPrice;

      const updatedInventory = { ...items, [item]: currentItemCount - amount };
      await tx.inventory.update({
        where: { id: inventoryRow.id },
        data: { items: serializeInventory(updatedInventory) },
      });
      await tx.user.update({ where: { id: user.id }, data: { cowoncy: newBalance } });

      await createLedgerEntry(tx, user.id, sellPrice, `Sold ${amount}x ${getItemDisplayName(item)}`, "SELL", oldBalance, newBalance);
      return { sellPrice, newBalance, itemDisplay: getItemDisplayName(item), amount };
    });

    await interaction.editReply(`Sold ${result.amount}x ${result.itemDisplay} for ${result.sellPrice} cowoncy. Balance: ${result.newBalance}`);
  },
};
