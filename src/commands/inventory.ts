import { Message } from "discord.js";
import { Command } from "./command";
import { ensureUser, prisma } from "../prisma";
import { buildInventorySummary } from "./utils";

export const inventoryCommand: Command = {
  data: { name: "inventory", description: "View your inventory." },
  cooldownSeconds: 0,
  async execute(message: Message) {
    const user = await ensureUser(message.author.id);
    const inventory = await prisma.inventory.findUnique({ where: { userId: user.id } });
    await message.reply(`====== ${message.member?.displayName ?? message.author.username}'s Inventory ======\n\n${buildInventorySummary((inventory?.items as Record<string, number>) ?? {})}`);
  },
};