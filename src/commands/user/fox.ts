import { Command } from "@sapphire/framework";
import { z } from "zod";
import { registerGuildCommand, replyWithRandomImage } from "../../lib/commands.js";

export class FoxCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Sends a random fox image", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await replyWithRandomImage(interaction, {
      title: "Random Fox Picture",
      endpoint: "https://randomfox.ca/floof/",
      schema: z.object({ image: z.string() }),
      pickUrl: (d) => d.image,
      imageHosts: ["randomfox.ca"],
    });
  }
}
