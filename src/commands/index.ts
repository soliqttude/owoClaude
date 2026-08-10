import { Command } from "./command";
import { huntCommand } from "./hunt";
import { cowoncyCommand } from "./cowoncy";
import { dailyCommand } from "./daily";
import { giveCommand } from "./give";
import { sellCommand } from "./sell";
import { inventoryCommand } from "./inventory";

export const commands: Command[] = [
  huntCommand,
  cowoncyCommand,
  dailyCommand,
  giveCommand,
  sellCommand,
  inventoryCommand,
];

export const commandMap = new Map(commands.map((command) => [command.data.name, command]));
