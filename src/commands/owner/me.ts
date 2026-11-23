import { Command } from "@sapphire/framework";
import { registerOwnerCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";

export class MeCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Sends a message about the bot owner", preconditions: ["OwnerOnly"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerOwnerCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const [owner] = this.container.config.BOT_OWNER_IDS;
    await interaction.reply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle("Hey its my developer Nate")
          .setThumbnail("https://antaresnetwork.com/resources/nate_pfp.png")
          .setDescription(`<@${owner}> is my owner and coded me. Ask him anything you might need :)`),
      ],
    });
  }
}
