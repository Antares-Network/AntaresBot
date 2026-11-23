import { Command } from "@sapphire/framework";
import { registerGuildCommand } from "../../lib/commands.js";
import { pick } from "../../lib/util.js";

// v1 included an empty string here, which made Discord reject the reply.
export const SNEEZES = [
  "***Achoo!***",
  "*chew!*",
  "Ah... Ah... **A_CHOO!_**",
  "_Ah..._***CHOOOOOOOOOOOOOOOOOOOO!***",
  "*Achoo!* Excuse me!",
] as const;

export class SneezeCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Makes the bot sneeze", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.reply(pick(SNEEZES));
  }
}
