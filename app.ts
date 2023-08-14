import http from "serverless-http";
import {Markup, Telegraf} from "telegraf";
import fetch from "node-fetch";

const token = process.env.BOT_TOKEN!;
const bot = new Telegraf(token);

bot.start(async (ctx) => {
  const user = ctx.from;
  const message_id = ctx.message.message_id;
  // 是否携带参数

  try {
    const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${user.id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
      }
    })
      .then(response => response.json())
      .then((data: any) => data.result)
    if (jwt) {
      const decode = jwt.split('.')[1]
      const decodeJson = JSON.parse(Buffer.from(decode, 'base64').toString())
      const exp = decodeJson.exp
      const address = decodeJson.walletAddress
      ctx.reply(`Welcome back, ${user.username}

*Address*: ${address}
*Expire at*: ${new Date(exp * 1000).toLocaleString()}`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('我的跟单', 'my_documentary'), Markup.button.callback('我的钱包', 'my_wallet')],
          [Markup.button.callback('设置', 'my_setting')],
        ])
      })
    } else {
      const code = Math.random().toString(36).substring(2, 18);
      await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/code:${code}?EX=600`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
        },
        body: JSON.stringify({
          message_id,
          user,
        })
      })
      ctx.reply(`Hi here! Please authorize me tp set up a NESTFi integration. 

*Note*: this link will be valid for 10 minutes.`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('Authorize me', `https://nest-fi-bot-web.vercel.app/${code}`)],
          [Markup.button.url('Authorize in Metamask', `https://metamask.app.link/dapp/nest-fi-bot-web.vercel.app/${code}`)],
        ])
      })
    }
  } catch (e) {
    ctx.reply(`Something went wrong: ${e}`)
    console.log(e)
  }
});

bot.help((ctx) => {
  ctx.reply(`I can help you at NESTFi. If you're new to NESTFi, please [see the website](https://nestfi.org).

You can control me by sending these commands:

/account - Welcome to NESTFi
/unauthorize - Cancel my authorization
/help - How to use?
`, {
    parse_mode: 'Markdown'
  })
});

// Stop command use to  delete authorization request
bot.command('unauthorize', async (ctx) => {
  const user = ctx.from;
  const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${user.id}`, {
    headers: {
      "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
    }
  }).then(response => response.json())
    .then((data: any) => data.result)
  if (jwt) {
    const decode = jwt.split('.')[1]
    const decodeJson = JSON.parse(Buffer.from(decode, 'base64').toString())
    const address = decodeJson.walletAddress
    ctx.reply(`You are about to cancel your NESTFi authorization in this bot. Is that correct?
    
*Address*: ${address}`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Yes, cancel it', 'logout')],
        [Markup.button.callback('No', 'menu')],
      ])
    })
  } else {
    ctx.reply('You have not authorized any wallet yet.')
  }
})

// Handle logout button click
bot.action('logout', async (ctx) => {
  const user = ctx.update.callback_query.from;
  await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/del/auth:${user.id}`, {
    headers: {
      "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
    }
  })
  ctx.editMessageText('You have successfully cancel your NESTFi authorization.', Markup.inlineKeyboard([]))
})

bot.command('webapp', async (ctx) => {
  ctx.reply('Open the NESTFi webapp', Markup.inlineKeyboard([
    [Markup.button.webApp('Open NESTFi', 'https://nestfi.org')],
  ]))
})

export const handler = http(bot.webhookCallback("/bot"));