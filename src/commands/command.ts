import type { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from "discord.js";

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  cooldownSeconds?: number;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
