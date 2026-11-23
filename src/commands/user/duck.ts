import { Command } from "@sapphire/framework";
import { z } from "zod";
import { registerGuildCommand, replyWithRandomImage } from "../../lib/commands.js";

export class DuckCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Sends a random duck image", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await replyWithRandomImage(interaction, {
      title: "Random Duck Picture",
      endpoint: "https://random-d.uk/api/v2/random",
      schema: z.object({ url: z.string() }),
      pickUrl: (d) => d.url, // API returns http:// URLs; safeImageUrl upgrades them to https
      imageHosts: ["random-d.uk"],
    });
  }
}
