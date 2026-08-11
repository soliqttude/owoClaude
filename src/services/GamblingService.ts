import { LedgerType } from "@prisma/client";
import { prisma, TransactionClient, createLedgerEntry, ensureUser, lockUserByDiscordId, lockUserById } from "../prisma";
import { CommandError } from "../commands/command";
import { parseBigInt } from "../commands/utils";
import { economyService } from "./EconomyService";

export const MIN_BET = 10n;
export const MAX_BET = 100000n;
const LOTTERY_TICKET_PRICE = 10n;
const LOTTERY_HOUSE_SHARE = 10n;
const LOTTERY_ROUND_HOURS = 24;

export interface BetSettlement {
  bet: bigint;
  payout: bigint;
  balance: bigint;
}

export interface DebitedBet {
  userId: string;
  bet: bigint;
  balanceAfterBet: bigint;
}

export function formatCurrency(value: bigint) {
  return value.toLocaleString("en-US");
}

export function parseBet(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) {
    throw new CommandError("INVALID_BET", `Bet must be a whole number from ${MIN_BET} to ${MAX_BET}.`);
  }

  const bet = BigInt(value);
  if (bet < MIN_BET) {
    throw new CommandError("BET_TOO_LOW", `The minimum bet is ${formatCurrency(MIN_BET)} cowoncy.`);
  }
  if (bet > MAX_BET) {
    throw new CommandError("BET_TOO_HIGH", `The maximum bet is ${formatCurrency(MAX_BET)} cowoncy.`);
  }
  return bet;
}

export function parsePositiveTicketCount(value: string | undefined) {
  if (!value || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
    throw new CommandError("INVALID_TICKETS", "Ticket quantity must be a positive whole number.");
  }
  return Number(value);
}

function randomInt(maxExclusive: number) {
  return Math.floor(Math.random() * maxExclusive);
}

function pick<T>(values: readonly T[]) {
  return values[randomInt(values.length)];
}

export class GamblingService {
  async debitBet(discordId: string, bet: bigint, reason: string): Promise<DebitedBet> {
    return economyService.debitBet(discordId, bet, reason);
  }

  async creditPayout(userId: string, payout: bigint, reason: string) {
    return economyService.creditPayout(userId, payout, reason);
  }

  async settleBet(
    discordId: string,
    bet: bigint,
    reason: string,
    resolve: () => { payout: bigint; result: unknown },
  ): Promise<BetSettlement & { result: unknown }> {
    return economyService.settleBet(discordId, bet, reason, resolve);
  }

  async buyLotteryTickets(discordId: string, ticketCount: number) {
    if (!Number.isInteger(ticketCount) || ticketCount <= 0) {
      throw new CommandError("INVALID_TICKETS", "Ticket quantity must be a positive whole number.");
    }

    const totalCost = BigInt(ticketCount) * LOTTERY_TICKET_PRICE;
    if (totalCost < MIN_BET || totalCost > MAX_BET) {
      throw new CommandError(
        "INVALID_BET",
        `Lottery purchases must total between ${formatCurrency(MIN_BET)} and ${formatCurrency(MAX_BET)} cowoncy.`,
      );
    }

    const user = await ensureUser(discordId);
    return prisma.$transaction(async (tx) => {
      let round: { id: string; pool: bigint; closesAt: Date } | null = await this.lockOpenLotteryRound(tx);
      let drawing: LotteryDrawing | null = null;
      if (round && round.closesAt.getTime() <= Date.now()) {
        drawing = await this.drawLockedRound(tx, round);
        round = null;
      }
      if (!round) {
        round = await tx.lotteryRound.create({
          data: {
            closesAt: new Date(Date.now() + LOTTERY_ROUND_HOURS * 60 * 60 * 1000),
          },
        });
      }

      const lockedUser = await lockUserById(tx, user.id);
      if (!lockedUser) throw new Error("Unable to lock your economy account.");
      const balanceBefore = parseBigInt(lockedUser.cowoncy);
      if (balanceBefore < totalCost) {
        throw new CommandError(
          "INSUFFICIENT_FUNDS",
          `You need ${formatCurrency(totalCost)} cowoncy, but only have ${formatCurrency(balanceBefore)}.`,
        );
      }

      const balanceAfter = balanceBefore - totalCost;
      await tx.user.update({ where: { id: user.id }, data: { cowoncy: balanceAfter } });
      await createLedgerEntry(
        tx,
        user.id,
        -totalCost,
        `Lottery purchase (${ticketCount} ticket${ticketCount === 1 ? "" : "s"})`,
        LedgerType.GAMBLING,
        balanceBefore,
        balanceAfter,
      );

      await tx.lotteryRound.update({
        where: { id: round.id },
        data: { pool: { increment: totalCost } },
      });
      await tx.lotteryTicket.upsert({
        where: { roundId_discordId: { roundId: round.id, discordId } },
        create: { roundId: round.id, discordId, tickets: ticketCount },
        update: { tickets: { increment: ticketCount } },
      });

      return { round, ticketCount, totalCost, balanceAfter, drawing };
    });
  }

  async lotteryStatus() {
    return prisma.$transaction(async (tx) => {
      let round: { id: string; pool: bigint; closesAt: Date } | null = await this.lockOpenLotteryRound(tx);
      let drawing: LotteryDrawing | null = null;
      if (round && round.closesAt.getTime() <= Date.now()) {
        drawing = await this.drawLockedRound(tx, round);
        round = null;
      }
      if (!round) {
        round = await tx.lotteryRound.create({
          data: { closesAt: new Date(Date.now() + LOTTERY_ROUND_HOURS * 60 * 60 * 1000) },
        });
      }
      const ticketRows = await tx.lotteryTicket.findMany({ where: { roundId: round.id } });
      const totalTickets = ticketRows.reduce((sum, row) => sum + row.tickets, 0);
      return { round, totalTickets, drawing };
    });
  }

  private async lockOpenLotteryRound(tx: TransactionClient) {
    const rows = await tx.$queryRaw<Array<{ id: string; pool: bigint; closesAt: Date }>>`
      SELECT id, pool, "closesAt"
      FROM "LotteryRound"
      WHERE "drawnAt" IS NULL
      ORDER BY "createdAt" DESC
      LIMIT 1
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  private async drawLockedRound(tx: TransactionClient, round: { id: string; pool: bigint; closesAt: Date }) {
    const tickets = await tx.lotteryTicket.findMany({ where: { roundId: round.id } });
    if (tickets.length === 0) {
      await tx.lotteryRound.update({ where: { id: round.id }, data: { drawnAt: new Date() } });
      return { winnerDiscordId: null, prize: 0n };
    }

    const totalTickets = tickets.reduce((sum, ticket) => sum + ticket.tickets, 0);
    let winningNumber = randomInt(totalTickets);
    const winner = tickets.find((ticket) => {
      winningNumber -= ticket.tickets;
      return winningNumber < 0;
    }) ?? tickets[tickets.length - 1];

    const prize = (parseBigInt(round.pool) * (100n - LOTTERY_HOUSE_SHARE)) / 100n;
    await tx.lotteryRound.update({
      where: { id: round.id },
      data: { drawnAt: new Date(), winnerDiscordId: winner.discordId },
    });

    if (prize > 0n) {
      const winnerUser = await lockUserByDiscordId(tx, winner.discordId);
      if (winnerUser) {
        const balanceBefore = parseBigInt(winnerUser.cowoncy);
        const balanceAfter = balanceBefore + prize;
        await tx.user.update({ where: { id: winnerUser.id }, data: { cowoncy: balanceAfter } });
        await createLedgerEntry(
          tx,
          winnerUser.id,
          prize,
          "Lottery prize payout",
          LedgerType.GAMBLING,
          balanceBefore,
          balanceAfter,
        );
      }
    }
    return { winnerDiscordId: winner.discordId, prize };
  }
}

export interface LotteryDrawing {
  winnerDiscordId: string | null;
  prize: bigint;
}

export const gamblingService = new GamblingService();
export { pick, randomInt };