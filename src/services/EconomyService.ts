import { LedgerType } from "@prisma/client";
import { CommandError } from "../commands/command";
import { parseBigInt } from "../commands/utils";
import {
  createLedgerEntry,
  ensureUser,
  lockUserById,
  prisma,
} from "../prisma";

export const MIN_ECONOMY_BET = 10n;
export const MAX_ECONOMY_BET = 100000n;

export interface DebitedEconomyBet {
  userId: string;
  bet: bigint;
  balanceAfterBet: bigint;
}

export interface EconomySettlement {
  bet: bigint;
  payout: bigint;
  balance: bigint;
  result: unknown;
}

export class EconomyService {
  async debitBet(discordId: string, bet: bigint, reason: string): Promise<DebitedEconomyBet> {
    this.assertBetRange(bet);
    const user = await ensureUser(discordId);

    return prisma.$transaction(async (tx) => {
      const lockedUser = await lockUserById(tx, user.id);
      if (!lockedUser) throw new Error("Unable to lock your economy account.");

      const balanceBefore = parseBigInt(lockedUser.cowoncy);
      this.assertFunds(balanceBefore, bet);
      const balanceAfterBet = balanceBefore - bet;

      await tx.user.update({ where: { id: user.id }, data: { cowoncy: balanceAfterBet } });
      await createLedgerEntry(
        tx,
        user.id,
        -bet,
        `${reason} bet`,
        LedgerType.GAMBLING,
        balanceBefore,
        balanceAfterBet,
      );
      return { userId: user.id, bet, balanceAfterBet };
    });
  }

  async creditPayout(userId: string, payout: bigint, reason: string) {
    if (payout < 0n) throw new Error("A gambling payout cannot be negative.");
    if (payout === 0n) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { cowoncy: true } });
      return parseBigInt(user?.cowoncy ?? 0n);
    }

    return prisma.$transaction(async (tx) => {
      const lockedUser = await lockUserById(tx, userId);
      if (!lockedUser) throw new Error("Unable to lock your economy account.");

      const balanceBefore = parseBigInt(lockedUser.cowoncy);
      const balanceAfter = balanceBefore + payout;
      await tx.user.update({ where: { id: userId }, data: { cowoncy: balanceAfter } });
      await createLedgerEntry(
        tx,
        userId,
        payout,
        `${reason} payout`,
        LedgerType.GAMBLING,
        balanceBefore,
        balanceAfter,
      );
      return balanceAfter;
    });
  }

  async settleBet(
    discordId: string,
    bet: bigint,
    reason: string,
    resolve: () => { payout: bigint; result: unknown },
  ): Promise<EconomySettlement> {
    this.assertBetRange(bet);
    const user = await ensureUser(discordId);

    return prisma.$transaction(async (tx) => {
      const lockedUser = await lockUserById(tx, user.id);
      if (!lockedUser) throw new Error("Unable to lock your economy account.");

      const balanceBefore = parseBigInt(lockedUser.cowoncy);
      this.assertFunds(balanceBefore, bet);
      const balanceAfterBet = balanceBefore - bet;

      await tx.user.update({ where: { id: user.id }, data: { cowoncy: balanceAfterBet } });
      await createLedgerEntry(
        tx,
        user.id,
        -bet,
        `${reason} bet`,
        LedgerType.GAMBLING,
        balanceBefore,
        balanceAfterBet,
      );

      const { payout, result } = resolve();
      if (payout < 0n) throw new Error("A gambling payout cannot be negative.");

      const finalBalance = balanceAfterBet + payout;
      if (payout > 0n) {
        await tx.user.update({ where: { id: user.id }, data: { cowoncy: finalBalance } });
        await createLedgerEntry(
          tx,
          user.id,
          payout,
          `${reason} payout`,
          LedgerType.GAMBLING,
          balanceAfterBet,
          finalBalance,
        );
      }

      return { bet, payout, balance: finalBalance, result };
    });
  }

  private assertBetRange(bet: bigint) {
    if (bet < MIN_ECONOMY_BET || bet > MAX_ECONOMY_BET) {
      throw new CommandError(
        "INVALID_BET",
        `Bet must be from ${MIN_ECONOMY_BET.toLocaleString()} to ${MAX_ECONOMY_BET.toLocaleString()} cowoncy.`,
      );
    }
  }

  private assertFunds(balance: bigint, bet: bigint) {
    if (balance < bet) {
      throw new CommandError(
        "INSUFFICIENT_FUNDS",
        `You need ${bet.toLocaleString()} cowoncy, but only have ${balance.toLocaleString()}.`,
      );
    }
  }
}

export const economyService = new EconomyService();