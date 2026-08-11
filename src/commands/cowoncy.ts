import { Message } from "discord.js";
import { Command } from "./command";
import { ensureUser } from "../prisma";
import { parseBigInt } from "./utils";

export const cowoncyCommand: Command = {
  data: { name: "cowoncy", description: "Show your cowoncy balance." },
  cooldownSeconds: 0,
  async execute(message: Message, args: string[]) {
    const user = await ensureUser(message.author.id);
    const balance = parseBigInt(user.cowoncy);
    
    const formattedBalance = balance.toLocaleString();
    let displayName = message.member?.displayName || message.author.username;

    const replyContent = `<:cowoncy:1536522907012825178> | ${displayName}, you currently have **__${formattedBalance} cowoncy__**!`;
    await message.reply({ content: replyContent });
  },
};
