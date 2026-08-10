import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./command";
import { ensureUser, prisma } from "../prisma";
import { buildInventorySummary } from "./utils";

export const inventoryCommand: Command = {
  data: new SlashCommandBuilder().setName("inventory").setDescription("View your inventory."),
  cooldownSeconds: 0,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const user = await ensureUser(interaction.user.id);
    const inventory = await prisma.inventory.findUnique({ where: { userId: user.id } });
    const content = buildInventorySummary((inventory?.items as Record<string, number>) ?? {});
    await interaction.editReply(content);
  },
};
