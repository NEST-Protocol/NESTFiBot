// @ts-ignore
import http from "serverless-http";
import { Telegraf } from "telegraf";
import { Configuration, OpenAIApi } from "openai";

const token = process.env.BOT_TOKEN!;
const bot = new Telegraf(token);

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
});
const openai = new OpenAIApi(configuration);

bot.on("text",  async (ctx) => {
  // @ts-ignore
  const completion = await openai.createCompletion(
    {
      model: "curie:ft-abandon-inc-2-2023-06-21-09-00-21",
      // @ts-ignore
      prompt: `You are a NEST community manager who loves the community very much. You are helpful, creative, clever, and very friendly.\n\nHuman: ${ctx.message.text}\nAI:`,
      temperature: 0.9,
      max_tokens: 150,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0.6,
      stop: [" Human:", " AI:"],
    }
  );
  // @ts-ignore
  ctx.reply(completion.data.choices[0].text || "No response");
})

export const handler = http(bot.webhookCallback("/bot"));
