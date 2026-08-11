import { Command } from "./command";
import { huntCommand } from "./hunt";
import { cowoncyCommand } from "./cowoncy";
import { dailyCommand } from "./daily";
import { giveCommand } from "./give";
import { sellCommand } from "./sell";
import { inventoryCommand } from "./inventory";
import { slotsCommand } from "./gambling/slots";
import { coinflipCommand } from "./gambling/coinflip";
import { blackjackCommand } from "./gambling/blackjack";
import { lotteryCommand } from "./gambling/lottery";
import { highlowCommand } from "./gambling/highlow";
import { minesCommand } from "./gambling/mines";
import { snailgardenCommand } from "./gambling/snailgarden";
import { addmoneyCommand } from "./addmoney";

export const commands: Command[] = [
  huntCommand,
  cowoncyCommand,
  dailyCommand,
  giveCommand,
  sellCommand,
  inventoryCommand,
  slotsCommand,
  coinflipCommand,
  blackjackCommand,
  lotteryCommand,
  highlowCommand,
  minesCommand,
  snailgardenCommand,
];

export const commandMap = new Map(commands.map((command) => [command.data.name, command]));

export { addmoneyCommand };
