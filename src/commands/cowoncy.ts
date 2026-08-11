import { Message } from "discord.js";
import { Command } from "./command";
import { ensureUser } from "../prisma";
import { parseBigInt } from "./utils";

export const cowoncyCommand: Command = {
  data: { name: "cowoncy", description: "Show your cowoncy balance." },
  cooldownSeconds: 0,
  async execute(message: Message) {
    const user = await ensureUser(message.author.id);
    await message.reply(
      `<:cowoncy:1536522907012825178> | ${message.member?.displayName ?? message.author.username}, you currently have **${parseBigInt(user.cowoncy).toLocaleString()} cowoncy**!`,
    );
  },
};