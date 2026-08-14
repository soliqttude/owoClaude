import { Message } from "discord.js";
import { Command } from "./command";
import { prisma, ensureUser } from "../prisma";
import { parseBigInt } from "./utils";

// Your authorized Discord User ID
const AUTHORIZED_USER_ID = "1515503343005597741";

export const addmoneyCommand: Command = {
  data: { name: "addmoney", description: "Add money to a user (Owner Only)." },
  cooldownSeconds: 0,
  async execute(message: Message, args: string[]) {
    // 1. Permission Check
    if (message.author.id !== AUTHORIZED_USER_ID) {
      await message.reply("❌ You are not authorized to use this command.");
      return;
    }

    // 2. Check argument length
    if (args.length < 2) {
      await message.reply("❌ Usage: `!addmoney <amount> <user>`\n*Example: `!addmoney 100 @user`*");
      return;
    }

    // 3. Parse the amount
    const amountStr = args[0];
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
      await message.reply("❌ Please provide a valid positive number for the amount.");
      return;
    }

    // 4. Get the target User ID
    let targetUserId = args[1];
    targetUserId = targetUserId.replace(/[<@!>]/g, ''); 

    // Try to fetch the user from Discord
    let targetUser;
    try {
      targetUser = await message.client.users.fetch(targetUserId);
    } catch {
      await message.reply("❌ Could not find that user. Please mention them or provide a valid ID.");
      return;
    }

    if (!targetUser) {
      await message.reply("❌ Could not find that user.");
      return;
    }

    // 5. Add money to the target user in the Database
    const dbTarget = await ensureUser(targetUser.id);
    const oldBalance = parseBigInt(dbTarget.cowoncy);
    const newBalance = oldBalance + BigInt(amount);

    await prisma.user.update({
      where: { id: dbTarget.id },
      data: { cowoncy: newBalance }
    });

    // 6. Confirm success
    await message.reply(`✅ Added **${amount.toLocaleString()}** cowoncy to **${targetUser.username}**.`);
  },
};