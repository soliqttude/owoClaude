import { Message } from "discord.js";
import { Command } from "./command";

const commandCode = (commands: string[]) => commands.map((command) => `\`${command}\``).join(" ");

export const helpCommand: Command = {
  data: { name: "help", description: "Show the complete command list." },
  cooldownSeconds: 0,
  async execute(message: Message) {
    const help =
      "📗 **Command List**\n\n" +
      "Here is the list of commands!\n" +
      "For more info on a specific command, use `owo help {command}`\n" +
      "Need more help? Ask in the server!\n\n" +
      "🏆 **Rankings**\n" +
      `${commandCode(["cowoncy"])}\n\n` +
      "💰 **Economy**\n" +
      `${commandCode(["cowoncy", "give", "daily", "hunt", "sell", "inventory"])}\n\n` +
      "🎲 **Gambling**\n" +
      `${commandCode(["slots", "coinflip", "lottery", "blackjack", "snailgarden", "mines", "highlow"])}\n\n` +
      "🧰 **Utility**\n" +
      `${commandCode(["help"])}`;
    await message.reply(help);
  },
};