import { Message } from "discord.js";
import { CommandError } from "./command";
import { prisma, ensureUser, createLedgerEntry, lockUserById } from "../prisma";
import { parseBigInt, parsePositiveInteger } from "./utils";
import { ADMIN_ID, addmoneyCommand } from "./addmoney";

export interface AdminCommand {
  name: string;
  description: string;
  execute: (message: Message, args: string[]) => Promise<void>;
}

function assertAdmin(message: Message) {
  if (message.author.id !== ADMIN_ID) {
    throw new CommandError("UNAUTHORIZED", "You are not authorized to use admin commands.");
  }
}

function getTarget(message: Message) {
  const target = message.mentions.users.first();
  if (!target) throw new CommandError("MISSING_USER", "Mention a user. Example: `!balance @user`.");
  if (target.bot) throw new CommandError("INVALID_USER", "The mentioned user cannot be a bot.");
  return target;
}

function getAmount(args: string[], label = "Amount") {
  const amount = args.find((arg) => /^\d+$/.test(arg));
  return BigInt(parsePositiveInteger(amount, label));
}

async function adjustBalance(targetId: string, delta: bigint, reason: string) {
  const user = await ensureUser(targetId);
  return prisma.$transaction(async (tx) => {
    const lockedUser = await lockUserById(tx, user.id);
    if (!lockedUser) throw new Error("Unable to lock the user's account.");

    const balanceBefore = parseBigInt(lockedUser.cowoncy);
    const balanceAfter = balanceBefore + delta;
    if (balanceAfter < 0n) {
      throw new CommandError("INSUFFICIENT_FUNDS", `That user only has ${balanceBefore.toLocaleString()} cowoncy.`);
    }

    await tx.user.update({ where: { id: user.id }, data: { cowoncy: balanceAfter } });
    if (delta !== 0n) {
      await createLedgerEntry(tx, user.id, delta, reason, "ADMIN_ADJUSTMENT", balanceBefore, balanceAfter);
    }
    return { balanceBefore, balanceAfter };
  });
}

export const menuCommand: AdminCommand = {
  name: "menu",
  description: "Show the admin command menu.",
  async execute(message) {
    assertAdmin(message);
    await message.reply(
      "🛠️ **Admin Command Menu**\n" +
      "Only the bot owner can use these commands.\n\n" +
      "`!addmoney <amount> @user` — Add cowoncy\n" +
      "`!setmoney <amount> @user` — Set a user's exact balance\n" +
      "`!removemoney <amount> @user` — Remove cowoncy\n" +
      "`!resetmoney @user` — Set a user's balance to zero\n" +
      "`!balance @user` — Check a user's balance\n" +
      "`!menu` — Show this menu",
    );
  },
};

export const setmoneyCommand: AdminCommand = {
  name: "setmoney",
  description: "Set a user's exact cowoncy balance.",
  async execute(message, args) {
    assertAdmin(message);
    const target = getTarget(message);
    const amount = getAmount(args);
    const currentUser = await ensureUser(target.id);
    const currentBalance = parseBigInt(currentUser.cowoncy);
    const result = await adjustBalance(target.id, amount - currentBalance, "Admin balance set");
    await message.reply(`Set ${target}'s balance to **${result.balanceAfter.toLocaleString()} cowoncy**.`);
  },
};

export const removemoneyCommand: AdminCommand = {
  name: "removemoney",
  description: "Remove cowoncy from a user.",
  async execute(message, args) {
    assertAdmin(message);
    const target = getTarget(message);
    const amount = getAmount(args);
    const result = await adjustBalance(target.id, -amount, "Admin balance removal");
    await message.reply(`Removed **${amount.toLocaleString()} cowoncy** from ${target}. New balance: **${result.balanceAfter.toLocaleString()}**.`);
  },
};

export const resetmoneyCommand: AdminCommand = {
  name: "resetmoney",
  description: "Reset a user's cowoncy balance to zero.",
  async execute(message) {
    assertAdmin(message);
    const target = getTarget(message);
    const user = await ensureUser(target.id);
    const currentBalance = parseBigInt(user.cowoncy);
    const result = await adjustBalance(target.id, -currentBalance, "Admin balance reset");
    await message.reply(`Reset ${target}'s balance. New balance: **${result.balanceAfter.toLocaleString()} cowoncy**.`);
  },
};

export const balanceCommand: AdminCommand = {
  name: "balance",
  description: "Check a user's cowoncy balance.",
  async execute(message) {
    assertAdmin(message);
    const target = getTarget(message);
    const user = await ensureUser(target.id);
    await message.reply(`${target} has **${parseBigInt(user.cowoncy).toLocaleString()} cowoncy**.`);
  },
};

export const adminCommands: AdminCommand[] = [
  {
    name: addmoneyCommand.data.name,
    description: addmoneyCommand.data.description ?? "Grant cowoncy to a user.",
    execute: addmoneyCommand.execute,
  },
  menuCommand,
  setmoneyCommand,
  removemoneyCommand,
  resetmoneyCommand,
  balanceCommand,
];