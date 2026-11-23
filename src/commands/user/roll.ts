import { randomInt } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import { Command } from "@sapphire/framework";
import { escapeMarkdown } from "discord.js";
import { registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";

export class RollCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Rolls a die", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const name = escapeMarkdown(interaction.user.username);
    const outcome = randomInt(1, 7);
    await interaction.reply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle("Dice Roll 🎲")
          .setDescription(`${name} rolled a die. What side will it land on?\n Rolling...`),
      ],
    });
    await wait(3000);
    await interaction.editReply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle("Dice Roll 🎲")
          .setThumbnail("https://antaresnetwork.com/resources/diceroll.gif")
          .setDescription(`${name} rolled a ${outcome}!`),
      ],
    });
  }
}
