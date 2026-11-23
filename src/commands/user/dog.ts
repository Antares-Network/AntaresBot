import { Command } from "@sapphire/framework";
import { z } from "zod";
import { registerGuildCommand, replyWithRandomImage } from "../../lib/commands.js";

export class DogCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Sends a random dog image", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await replyWithRandomImage(interaction, {
      title: "Random Dog Picture",
      endpoint: "https://dog.ceo/api/breeds/image/random",
      schema: z.object({ message: z.string() }),
      pickUrl: (d) => d.message,
      imageHosts: ["dog.ceo"],
    });
  }
}
