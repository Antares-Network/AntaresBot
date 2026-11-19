import { Command } from "@sapphire/framework";
import { ephemeral, registerOwnerCommand } from "../../lib/commands.js";
import { toSnowflake } from "../../lib/util.js";

export class LeaveCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Forces the bot to leave a server", preconditions: ["OwnerOnly"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerOwnerCommand(this, registry, (b) =>
      b.addStringOption((o) => o.setName("server_id").setDescription("Guild ID").setRequired(true).setMinLength(17).setMaxLength(20)),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const id = toSnowflake(interaction.options.getString("server_id", true));
    const guild = id ? interaction.client.guilds.cache.get(id) : undefined;
    if (!guild) {
      await interaction.reply({ content: "I'm not in a server with that ID.", flags: ephemeral });
      return;
    }
    // Reply first: if this is the guild the command was run in, we can't reply after leaving.
    await interaction.reply({
      content: `Leaving \`${guild.name}\` (\`${guild.id}\`) as requested by <@${interaction.user.id}>.`,
      flags: ephemeral,
    });
    await guild.leave();
  }
}
