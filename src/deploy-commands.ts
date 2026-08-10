import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  throw new Error("DISCORD_TOKEN and DISCORD_CLIENT_ID are required in .env");
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  console.log("Deploying slash commands...");

  await rest.put(Routes.applicationCommands(clientId), {
    body: commands.map((command) => command.data.toJSON()),
  });

  console.log("Slash commands deployed successfully.");
})();
