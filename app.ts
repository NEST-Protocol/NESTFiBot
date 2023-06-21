// @ts-ignore
import http from "serverless-http";
import { Telegraf } from "telegraf";
import { Configuration, OpenAIApi } from "openai";

const token = process.env.BOT_TOKEN!;
const bot = new Telegraf(token);

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

bot.on("text",  async (ctx) => {
  try {
    const chatCompletion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {role: "system", content: "You are NEST Protocol Community Manager. You are talking to a user who is asking for help with a problem."},
        {role: "user", content: ctx.message.text}
      ],
    });
    // @ts-ignore
    ctx.reply(chatCompletion.data.choices[0].message.content);
  } catch (e) {
    console.log(e);
    ctx.reply(String(e));
  }
})

export const handler = http(bot.webhookCallback("/bot"));
