import { Command } from "@sapphire/framework";
import { registerGuildCommand } from "../../lib/commands.js";
import { ICON_URL, inviteUrl, SUPPORT_SERVER_URL } from "../../lib/constants.js";
import { brandEmbed } from "../../lib/embeds.js";

// v1 registered this as a legacy text command but read `interaction`, so it never worked.
export class InviteCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: "Sends an invite for the bot and the support server",
      preconditions: ["BotChannel"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.reply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle("Invite")
          .setURL(inviteUrl(interaction.client.user.id))
          .setThumbnail(ICON_URL)
          .setDescription(
            `[Click here to invite Antares Bot to your server](${inviteUrl(interaction.client.user.id)})` +
              `\n[Join our support server](${SUPPORT_SERVER_URL})`,
          ),
      ],
    });
  }
}
