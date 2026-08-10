import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./command";
import { prisma, TransactionClient, ensureUser, createLedgerEntry, lockUserById, lockInventoryByUserId } from "../prisma";
import { getRandomHuntItem, getShinyVariant, getItemDisplayName } from "./items";
import { parseBigInt, serializeInventory } from "./utils";

function rollShiny(pity: number) {
  const base = 0.01;
  const bonus = 0.005 * pity;
  const chance = Math.min(0.80, base + bonus);
  return Math.random() < chance;
}

export const huntCommand: Command = {
  data: new SlashCommandBuilder().setName("hunt").setDescription("Hunt for owo creatures and gear."),
  cooldownSeconds: 10,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = await ensureUser(interaction.user.id);

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const lockedUser = await lockUserById(tx, user.id);
      if (!lockedUser) throw new Error("Unable to lock user account.");
      const currentCowoncy = parseBigInt(lockedUser.cowoncy);
      const currentPity = Number(lockedUser.huntPity ?? 0);

      const isShiny = rollShiny(currentPity);
      const baseItem = getRandomHuntItem();
      const itemKey = isShiny ? getShinyVariant(baseItem) ?? baseItem : baseItem;
      const itemDisplay = getItemDisplayName(itemKey);

      const reward = BigInt(40 + Math.floor(Math.random() * 90));
      const newBalance = currentCowoncy + reward;
      const newPity = isShiny ? 0 : currentPity + 1;

      const inventoryRow = await lockInventoryByUserId(tx, user.id);
      const inventory = inventoryRow?.items as Record<string, number> | null;
      const currentItems = inventory ?? {};
      const updatedItems = { ...currentItems, [itemKey]: (currentItems[itemKey] ?? 0) + 1 };

      await tx.user.update({
        where: { id: user.id },
        data: { cowoncy: newBalance, huntPity: newPity },
      });

      if (inventoryRow) {
        await tx.inventory.update({
          where: { id: inventoryRow.id },
          data: { items: serializeInventory(updatedItems) },
        });
      } else {
        await tx.inventory.create({ data: { userId: user.id, items: serializeInventory(updatedItems) } });
      }

      await createLedgerEntry(
        tx,
        user.id,
        reward,
        `Hunt reward for catching ${itemDisplay}`,
        "HUNT",
        currentCowoncy,
        newBalance,
      );

      return { itemKey, itemDisplay, reward, isShiny, newBalance, newPity };
    });

    const description = result.isShiny
      ? `You found a **${result.itemDisplay}**! Shiny luck saved the day.`
      : `You hunted a **${result.itemDisplay}**.`;

    await interaction.editReply(
      `${description}\n+${result.reward} cowoncy\nBalance: ${result.newBalance} cowoncy\nHunt pity: ${result.newPity}`,
    );
  },
};
