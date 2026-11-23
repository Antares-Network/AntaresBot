import { Events, Listener } from "@sapphire/framework";
import type { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { handleStarReaction } from "./starboardReaction.js";

/** Un-starring updates the count on the existing starboard post (same logic as adding). */
export class StarboardReactionRemoveListener extends Listener<typeof Events.MessageReactionRemove> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.MessageReactionRemove });
  }
  public override async run(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
    await handleStarReaction(reaction, user);
  }
}
