import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./command";
import { ensureUser } from "../prisma";
import { parseBigInt } from "./utils";

export const cowoncyCommand: Command = {
  data: new SlashCommandBuilder().setName("cowoncy").setDescription("Show your cowoncy balance."),
  cooldownSeconds: 0,
  async execute(interaction: ChatInputCommandInteraction) {
    const user = await ensureUser(interaction.user.id);
    const balance = parseBigInt(user.cowoncy);
    await interaction.reply({ content: `You have ${balance} cowoncy.`, ephemeral: true });
  },
};
