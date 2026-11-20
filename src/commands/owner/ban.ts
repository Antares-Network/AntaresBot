import { Command } from "@sapphire/framework";
import { ephemeral, registerOwnerCommand } from "../../lib/commands.js";
import { toSnowflake } from "../../lib/util.js";
import { gate, type GateKind } from "../../lib/services/gate.js";

const LISTS: Record<string, GateKind> = {
  user: "user",
  guild: "guild",
  owner: "owner",
};

/**
 * v1 had ban/unban helpers (actions/guildBan.ts) but no command used them, and two of
 * them wrote to the wrong list. This exposes the fixed operations to the owner.
 */
export class BanCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Ban or unban a user, guild, or guild owner from using the bot", preconditions: ["OwnerOnly"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerOwnerCommand(this, registry, (b) =>
      b
        .addStringOption((o) =>
          o
            .setName("action")
            .setDescription("ban or unban")
            .setRequired(true)
            .addChoices({ name: "ban", value: "ban" }, { name: "unban", value: "unban" }),
        )
        .addStringOption((o) =>
          o
            .setName("target")
            .setDescription("What kind of ID")
            .setRequired(true)
            .addChoices({ name: "user", value: "user" }, { name: "guild", value: "guild" }, { name: "guild owner", value: "owner" }),
        )
        .addStringOption((o) => o.setName("id").setDescription("Snowflake ID").setRequired(true).setMinLength(17).setMaxLength(20)),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const action = interaction.options.getString("action", true);
    const target = interaction.options.getString("target", true);
    const id = toSnowflake(interaction.options.getString("id", true));
    const list = Object.hasOwn(LISTS, target) ? LISTS[target] : undefined;
    if (!list || !id) {
      await interaction.reply({ content: "Invalid target or ID.", flags: ephemeral });
      return;
    }
    if (action === "ban" && this.container.config.BOT_OWNER_IDS.includes(id)) {
      await interaction.reply({ content: "Refusing to ban a bot owner.", flags: ephemeral });
      return;
    }
    const changed = action === "ban" ? await gate.add(list, id) : await gate.remove(list, id);
    await interaction.reply({
      content: changed ? `${action === "ban" ? "Banned" : "Unbanned"} ${target} \`${id}\`.` : `No change: ${target} \`${id}\` was already ${action}ned.`,
      flags: ephemeral,
    });
  }
}
