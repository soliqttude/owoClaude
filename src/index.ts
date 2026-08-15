import { Client, GatewayIntentBits, Collection, Message } from "discord.js";
import { config } from "dotenv";
import { CommandError } from "./commands/command";
import { commands } from "./commands";
import { adminCommands } from "./commands/admin";
import { checkCooldown, setCooldown } from "./middleware";

config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const commandMap = new Collection<string, typeof commands[number]>();
for (const command of commands) commandMap.set(command.data.name, command);
const adminCommandMap = new Collection<string, (typeof adminCommands)[number]>();
for (const command of adminCommands) adminCommandMap.set(command.name, command);

const OWO_PREFIX = "owo";
const ADMIN_PREFIX = "!";

function parseCommand(content: string, prefix: string, requiresSeparator = false) {
  if (!content.startsWith(prefix)) return null;
  const remainder = content.slice(prefix.length);
  if (requiresSeparator && remainder.length > 0 && !/\s/.test(remainder[0])) return null;
  const tokens = remainder.trim().split(/\s+/);
  const commandName = tokens.shift()?.toLowerCase();
  if (!commandName) return null;
  return { commandName, args: tokens };
}

async function executeCommand(message: Message, command: typeof commands[number], args: string[]) {
  const remaining = checkCooldown(message.author.id, command.data.name);
  if (remaining > 0) {
    await message.reply(`Please wait **${remaining}s** before using \`${command.data.name}\` again.`);
    return;
  }

  await command.execute(message, args);
  setCooldown(message.author.id, command.data.name, command.cooldownSeconds);
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const adminParsed = parseCommand(message.content, ADMIN_PREFIX);
  const adminCommand = adminParsed ? adminCommandMap.get(adminParsed.commandName) : undefined;
  if (adminParsed && adminCommand) {
    try {
      await adminCommand.execute(message, adminParsed.args);
    } catch (error) {
      await handleCommandError(message, error);
    }
    return;
  }

  const parsed = parseCommand(message.content, OWO_PREFIX, true);
  if (!parsed) return;
  const command = commandMap.get(parsed.commandName);
  if (!command) return;

  try {
    await executeCommand(message, command, parsed.args);
  } catch (error) {
    await handleCommandError(message, error);
  }
});

async function handleCommandError(message: Message, error: unknown) {
  if (error instanceof CommandError) {
    await message.reply(error.message);
    return;
  }
  const details = error instanceof Error ? error.message : String(error);
  console.error("Command execution failed:", error);
  await message.reply(`Something went wrong while processing that command. No balance was changed.\n\`${details}\``);
}

if (!process.env.DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN is required.");
}

void client.login(process.env.DISCORD_TOKEN);