import { Message } from "discord.js";

export interface Command {
  data: {
    name: string;
    description?: string;
  };
  cooldownSeconds: number;
  execute: (message: Message, args: string[]) => Promise<void>;
}

export class CommandError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CommandError";
    this.code = code;
  }
}