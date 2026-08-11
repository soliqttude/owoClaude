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
    
    const formattedBalance = balance.toLocaleString();
    
    // SWAPPED: interaction.member.displayName
    const replyContent = `<:cowoncy:1536522907012825178> | ${interaction.member.displayName}, you currently have **__${formattedBalance} cowoncy__**!`;

    await interaction.reply({ content: replyContent });
  },
};