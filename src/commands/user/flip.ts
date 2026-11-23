import { randomInt } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import { Command } from "@sapphire/framework";
import { escapeMarkdown } from "discord.js";
import { registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";

export class FlipCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Flips a coin", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const name = escapeMarkdown(interaction.user.username);
    const outcome = randomInt(2) === 0 ? "Tails" : "Heads";
    await interaction.reply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle("Coin Flip 💰")
          .setDescription(`${name} flipped a coin. What side will it land on?\n Flipping...`),
      ],
    });
    await wait(3000);
    await interaction.editReply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle("Coin Flip 💰")
          .setThumbnail("https://antaresnetwork.com/resources/coinflip.gif")
          .setDescription(`${name} got ${outcome}!`),
      ],
    });
  }
}
