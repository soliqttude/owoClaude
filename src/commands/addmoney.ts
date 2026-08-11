import { Message } from "discord.js";
import { LedgerType } from "@prisma/client";
import { Command, CommandError } from "./command";
import { prisma, ensureUser, createLedgerEntry, lockUserById } from "../prisma";
import { parseBigInt, parsePositiveInteger } from "./utils";

const ADMIN_ID = "1515503343005597741";

export const addmoneyCommand: Command = {
  data: { name: "addmoney", description: "Grant cowoncy to a user." },
  cooldownSeconds: 0,
  async execute(message: Message, args: string[]) {
    if (message.author.id !== ADMIN_ID) {
      throw new CommandError("UNAUTHORIZED", "You are not authorized to use this command.");
    }
    const target = message.mentions.users.first();
    if (!target) throw new CommandError("MISSING_USER", "Mention a user. Example: `!addmoney 1000 @user`.");
    if (target.bot) throw new CommandError("INVALID_USER", "The mentioned user cannot be a bot.");
    const amountIndex = args.findIndex((arg) => /^\d+$/.test(arg));
    const amount = BigInt(parsePositiveInteger(amountIndex >= 0 ? args[amountIndex] : undefined, "Amount"));
    const user = await ensureUser(target.id);

    const newBalance = await prisma.$transaction(async (tx) => {
      const lockedUser = await lockUserById(tx, user.id);
      if (!lockedUser) throw new Error("Unable to lock the recipient's account.");
      const balanceBefore = parseBigInt(lockedUser.cowoncy);
      const balanceAfter = balanceBefore + amount;
      await tx.user.update({ where: { id: user.id }, data: { cowoncy: balanceAfter } });
      await createLedgerEntry(tx, user.id, amount, "admin_grant", LedgerType.ADMIN_GRANT, balanceBefore, balanceAfter);
      return balanceAfter;
    });
    await message.reply(`Added **${amount.toLocaleString()} cowoncy** to ${target}. New balance: **${newBalance.toLocaleString()}**.`);
  },
};