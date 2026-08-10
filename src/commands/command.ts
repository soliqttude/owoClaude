import type { ChatInputCommandInteraction } from "discord.js";
import type { SlashCommandBuilder } from "@discordjs/builders";

export interface Command {
  data: SlashCommandBuilder;
  cooldownSeconds?: number;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
