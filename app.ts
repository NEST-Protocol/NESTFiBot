import http from "serverless-http";
import {Markup, Telegraf} from "telegraf";
import fetch from "node-fetch";
import {message} from "telegraf/filters";

const token = process.env.BOT_TOKEN!;
const bot = new Telegraf(token);

// What can this bot do?
bot.start(async (ctx) => {
  const user = ctx.from;
  try {
    const authorization = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${user.id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
      }
    })
      .then(response => response.json())
      .then((data: any) => data.result)
    if (authorization) {
      ctx.reply(`Welcome back, ${user.username}`)
    } else {
      const code = Math.random().toString(36).substring(2, 18);
        await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/code:${code}?EX=600`, {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
          },
          body: JSON.stringify(user)
        })
        ctx.reply('Hi here! Please authorize me tp set up a NESTFi integration.', Markup.inlineKeyboard([
          Markup.button.url('Authorize me', `https://nest-fi-bot-web.vercel.app/?code=${code}`)
        ]))
    }
  } catch (e) {
    ctx.reply(`Something went wrong: ${e}`)
    console.log(e)
  }
});

bot.command('menu', async () => {

})

bot.command('account', async (ctx) => {
})

bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.on(message('sticker'), (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => ctx.reply('Hey there'));

export const handler = http(bot.webhookCallback("/bot"));