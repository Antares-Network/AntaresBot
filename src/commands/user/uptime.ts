import { Command } from "@sapphire/framework";
import { registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { formatUptime } from "../../lib/util.js";

export class UptimeCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Checks how long the bot has been online.", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.reply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle("Bot Uptime")
          .setDescription(`I have been online for ${formatUptime(interaction.client.uptime)}`),
      ],
    });
  }
}
