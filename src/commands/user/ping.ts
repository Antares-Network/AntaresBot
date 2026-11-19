import { Command } from "@sapphire/framework";
import { registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";

export class PingCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Sends the ping time of the bot.", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.reply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle("Bot/API Ping")
          .setDescription(`Ping: 🏓 | Latency is: **${Math.max(interaction.client.ws.ping, 0)}**ms.`),
      ],
    });
  }
}
