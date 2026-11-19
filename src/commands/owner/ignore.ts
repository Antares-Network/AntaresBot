import { Command } from "@sapphire/framework";
import { ephemeral, registerOwnerCommand } from "../../lib/commands.js";
import { toSnowflake } from "../../lib/util.js";
import { gate } from "../../lib/services/gate.js";

export class IgnoreCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Ignores (or un-ignores) a server completely", preconditions: ["OwnerOnly"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerOwnerCommand(this, registry, (b) =>
      b
        .addStringOption((o) => o.setName("server_id").setDescription("Guild ID").setRequired(true).setMinLength(17).setMaxLength(20))
        .addBooleanOption((o) => o.setName("undo").setDescription("Stop ignoring this server instead")),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const id = toSnowflake(interaction.options.getString("server_id", true));
    if (!id) {
      await interaction.reply({ content: "That isn't a valid server ID.", flags: ephemeral });
      return;
    }
    const undo = interaction.options.getBoolean("undo") ?? false;
    const name = interaction.client.guilds.cache.get(id)?.name ?? "unknown";
    const changed = undo ? await gate.remove("ignored_guild", id) : await gate.add("ignored_guild", id);
    const verb = undo ? "no longer ignoring" : "now ignoring";
    await interaction.reply({
      content: changed ? `I am ${verb} \`${name}\` (\`${id}\`).` : `No change: \`${id}\` was already in that state.`,
      flags: ephemeral,
    });
  }
}
