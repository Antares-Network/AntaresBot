import { Message, Client } from "discord.js";
import piiModel from "../models/pii";

async function count(message: Message, client: Client) {
  let srv = await piiModel.findOne({ GUILD_ID: message.guild?.id }); //find the entry for the guild
  // Stores the current count.
  let count = Number(srv.GUILD_COUNTING_NUMBER);
  // Only do this for the counting channel of course
  if (
    client.channels.cache.get(srv.GUILD_COUNTING_CHANNEL_ID) === message.channel
  ) {
    // You can ignore all bot messages like this
    if (message.member?.user.bot) return;
    if (message.author.bot) return;
    // If the message is the current count + 1...
    message.channel.messages.fetch({ limit: 2 }).then(async (messages) => {
      let lm = messages.last();
      if (lm?.author.id == message.author.id) {
        message.delete();
        message.channel
          .send(
            `Wait your turn! Please wait for someone else to send the next number.`
          )
          .then((msg) => {
            setTimeout(() => msg.delete(), 5000);
          });
      } else if (Number(message.content) === count + 1) {
        // ...increase the count
        count++;
        await piiModel.findOneAndUpdate(
          { GUILD_ID: message.guild?.id },
          { $set: { GUILD_COUNTING_NUMBER: count } },
          { new: true }
        );
        // If the message wasn't sent by the bot...
      } else if (message.member?.id !== client.user?.id) {
        // ...send a message because the person stuffed up the counting
        message.delete();
        message.channel
          .send(
            `That is not the correct number. You should type *${count + 1}*`
          )
          .then((msg) => {
            setTimeout(() => msg.delete(), 5000);
          });
      }
    });
  }
}

export = { count };
