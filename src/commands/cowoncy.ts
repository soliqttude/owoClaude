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
    
    // Format the number with commas (e.g., 90,000)
    const formattedBalance = balance.toLocaleString();
    
    // Build the reply exactly like the screenshot
    // Use the emoji ID you provided, and the username
    const replyContent = `<:cowoncy:1536522907012825178> | ${interaction.user.username}, you currently have **__${formattedBalance} cowoncy__**!`;

    // Send it (removed ephemeral: true so it looks like the screenshot, but you can add it back if you want)
    await interaction.reply({ content: replyContent });
  },
};