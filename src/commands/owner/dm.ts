import { Command } from "@sapphire/framework";
import { ephemeral, registerOwnerCommand } from "../../lib/commands.js";

export class DmCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Sends something in a dm to a user", preconditions: ["OwnerOnly"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerOwnerCommand(this, registry, (b) =>
      b
        .addUserOption((o) => o.setName("user").setDescription("User to DM (or paste an ID)").setRequired(true))
        .addStringOption((o) => o.setName("text").setDescription("Message").setRequired(true).setMaxLength(2000)),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user", true);
    const text = interaction.options.getString("text", true);
    try {
      await user.send({ content: text, allowedMentions: { parse: [] } });
      await interaction.reply({ content: `Sent to ${user.tag} (${user.id}).`, flags: ephemeral });
    } catch {
      await interaction.reply({ content: `Couldn't DM ${user.tag}; their DMs are probably closed.`, flags: ephemeral });
    }
  }
}
