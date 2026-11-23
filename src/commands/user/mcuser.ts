import { Command } from "@sapphire/framework";
import { z } from "zod";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { fetchJson, HttpError } from "../../lib/http.js";

/** Mojang's own rules for Java Edition usernames. Validating stops path injection into the API URL. */
export const MC_USERNAME = /^[A-Za-z0-9_]{3,16}$/;

const Profile = z.object({ id: z.string().regex(/^[0-9a-f]{32}$/i), name: z.string() });

function dashedUuid(id: string): string {
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

export class McUserCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "mcuser",
      description: "Gets the username, skin and UUID of a Minecraft account",
      preconditions: ["BotChannel"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b.addStringOption((o) =>
        o
          .setName("username")
          .setDescription("Any valid Minecraft username")
          .setRequired(true)
          .setMinLength(3)
          .setMaxLength(16),
      ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const username = interaction.options.getString("username", true);
    if (!MC_USERNAME.test(username)) {
      await interaction.reply({ content: "That isn't a valid Minecraft username.", flags: ephemeral });
      return;
    }
    await interaction.deferReply();

    let profile: z.infer<typeof Profile>;
    try {
      // Official Mojang API (v1 used a third-party mirror that now rate-limits).
      profile = await fetchJson(`https://api.mojang.com/users/profiles/minecraft/${username}`, Profile);
    } catch (err) {
      if (err instanceof HttpError && (err.status === 404 || err.status === 204)) {
        await interaction.editReply("No Minecraft account exists with that username.");
        return;
      }
      throw err;
    }

    const uuid = dashedUuid(profile.id);
    await interaction.editReply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle(`${profile.name}'s info`)
          .setImage(`https://crafatar.com/renders/body/${profile.id}?overlay`)
          .setDescription(`**Username:** ${profile.name}\n**UUID:** ${uuid}`),
      ],
    });
  }
}
