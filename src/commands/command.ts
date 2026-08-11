import { Message } from "discord.js";

// This interface defines what a valid Prefix Command looks like
export interface Command {
  data: {
    name: string;
    description?: string;
  };
  cooldownSeconds: number;
  execute: (message: Message, args: string[]) => Promise<void>;
}