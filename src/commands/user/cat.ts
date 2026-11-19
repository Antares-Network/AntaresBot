import { Command } from "@sapphire/framework";
import { z } from "zod";
import { registerGuildCommand, replyWithRandomImage } from "../../lib/commands.js";

export class CatCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Sends a random cat image", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    // random.cat is gone; TheCatAPI's anonymous endpoint returns the same kind of result.
    await replyWithRandomImage(interaction, {
      title: "Random Cat Picture",
      endpoint: "https://api.thecatapi.com/v1/images/search",
      schema: z.tuple([z.object({ url: z.string() })], z.unknown()),
      pickUrl: ([first]) => first.url,
      imageHosts: ["thecatapi.com"],
    });
  }
}
