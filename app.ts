import http from "serverless-http";
import {Markup, Telegraf} from "telegraf";
import fetch from "node-fetch";
import {isAddress} from "ethers";

const token = process.env.BOT_TOKEN!;
const bot = new Telegraf(token);

bot.start(async (ctx) => {
  const user = ctx.from;
  const message_id = ctx.message.message_id;
  try {
    const code = ctx.message.text
      .replace(/\s+/g, ' ').trim()
      .split(' ')[1]

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
      const address = decodeJson.walletAddress

      if (code && isAddress(code)) {
        // 可以跟单,需要判断code是否在白名单



      } else {
        ctx.reply(`Welcome back, ${user.username}
        
*Copy trading assets*: xxx NEST
*Profit*:  xxx NEST
*Unrealized PNL*:  xxx NEST
*Address*: ${address}
`, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('My Account', 'my_account')],
            [Markup.button.callback('My Copy Trading', 'my_copy_trading')],
          ])
        })
      }
    } else {
      if (code && isAddress(code)) {
        ctx.reply(`First, you should bind your wallet. And then you can copy again.`, Markup.inlineKeyboard([
          [Markup.button.callback(`Copy again`, `https://t.me/nestfi.org?start=${code}`)],
        ]))
      }
      const nonce = Math.random().toString(36).substring(2, 18);
      await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/code:${nonce}?EX=600`, {
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

*Note*: this link will be valid for 10 minutes.
----dev
${JSON.stringify(ctx.message)}`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('Authorize me', `https://nest-fi-bot-web.vercel.app/${nonce}`)],
          [Markup.button.url('Authorize in Metamask', `https://metamask.app.link/dapp/nest-fi-bot-web.vercel.app/${nonce}`)],
        ])
      })
    }
  } catch (e) {
    ctx.reply(`Something went wrong.`)
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

bot.command('account', async (ctx) => {
  const user = ctx.from;
  const message_id = ctx.message.message_id;
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
      const address = decodeJson.walletAddress
      ctx.reply(`Hi, ${user.username}

*Copy trading assets*: xxx NEST
*Profit*:  xxx NEST
*Unrealized PNL*:  xxx NEST
*Address*: ${address}
`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('My Account', 'my_account')],
          [Markup.button.callback('My Copy Trading', 'my_copy_trading')],
        ])
      })
    } else {
      ctx.reply(`Hi here! Please authorize me tp set up a NESTFi integration. 
      
You can use command: /start`, {
        parse_mode: 'Markdown',
      })
    }
  } catch (e) {
    ctx.reply(`Something went wrong.`)
    console.log(e)
  }
})

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
        [Markup.button.callback('Yes, cancel it', 'my_unauthorize')],
        [Markup.button.callback('No', 'menu')],
      ])
    })
  } else {
    ctx.reply('You have not authorized any wallet yet.')
  }
})

bot.action('my_menu', async (ctx) => {
  const user = ctx.update.callback_query.from;
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
    const address = decodeJson.walletAddress
    ctx.answerCbQuery()
    ctx.editMessageText(`Welcome back, ${user.username}!
  
*Copy trading assets*: xxx NEST
*Profit*:  xxx NEST
*Unrealized PNL*:  xxx NEST
*Address*: ${address}
`, Markup.inlineKeyboard([
      [Markup.button.callback('My Account', 'my_account')],
      [Markup.button.callback('My Copy Trading', 'my_copy_trading_0')],
    ]))
  } else {
    ctx.reply(`Hi ${user.username}! Please authorize me tp set up a NESTFi integration.

You can use command: /start`)
  }
})

bot.action('my_account', async (ctx) => {
  const user = ctx.update.callback_query.from;
  const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${user.id}`, {
    headers: {
      "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
    }
  })
    .then(response => response.json())
    .then((data: any) => data.result)

  if (jwt) {
    ctx.answerCbQuery()
    ctx.editMessageText(`可提现金额: xxx NEST`, Markup.inlineKeyboard([
      [Markup.button.url('Deposit', 'https://nestfi.org/')],
      [Markup.button.url('Withdraw', 'https://nestfi.org/')],
      [Markup.button.callback('Back', 'my_menu')],
    ]))
  } else {
    ctx.answerCbQuery()
    ctx.editMessageText(`Hi ${user.username}! Please authorize me tp set up a NESTFi integration.

You can use command: /start`)
  }
})

// TODO, my_copy_trading_[page number]
// 使用正则表达式，表示这个triggers:
bot.action('my_copy_trading_0', async (ctx) => {
  const user = ctx.update.callback_query.from;
  const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${user.id}`, {
    headers: {
      "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
    }
  })
    .then(response => response.json())
    .then((data: any) => data.result)
  if (jwt) {
    ctx.answerCbQuery()
    ctx.editMessageText(`我跟随的交易员:`, Markup.inlineKeyboard([
      [Markup.button.callback('交易员1: 1000 NEST', 'my_copy_1')],
      [Markup.button.callback('交易员2: 2000 NEST', 'my_copy_2')],
      [Markup.button.callback('Back', 'my_menu')],
    ]))
  } else {
    ctx.answerCbQuery()
    ctx.editMessageText(`Hi ${user.username}! Please authorize me tp set up a NESTFi integration.

You can use command: /start`)
  }
})

bot.action('my_copy_1', async (ctx) => {
  ctx.answerCbQuery()
  ctx.editMessageText(`我跟随的交易员`, Markup.inlineKeyboard([
    [Markup.button.callback('查看订单', 'my_detail_1')],
    [Markup.button.callback('停止跟单并结算', 'my_stop_1')],
    [Markup.button.callback('跟单设置', 'my_copy_setting_1')],
    [Markup.button.callback('Back', 'my_copy_trading_0')],
  ]))
})

bot.action('my_detail_1', async (ctx) => {
  ctx.answerCbQuery()
  ctx.editMessageText(`您可在这里操作您的仓位`, Markup.inlineKeyboard([
    [Markup.button.callback('BTC/USDT 20x (+200NEST)', 'my_position_1')],
    [Markup.button.callback('DOGE/USDT 20x (+200NEST)', 'my_position_2')],
    [Markup.button.callback('XRP/USDT 20x (+200NEST)', 'my_position_3')],
    [Markup.button.url('History', 'https://nestfi.org/'), Markup.button.callback('Back', 'my_copy_1')],
  ]))
})

bot.action('my_position_1', async (ctx) => {
  ctx.answerCbQuery()
  ctx.editMessageText(`BTC/USDT Long 20x Actual Margin：6418.25 NEST +14.99%
Open Price: 1418.25 USDT Exit Price: 1320.99 USDT Liq Price: 1400.00 USDT Open Time：04-15 10:18:15 `, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('Close', 'my_close_position_1')],
      [Markup.button.callback('Back', 'my_detail_1')],
    ])
  })
})

bot.action('my_close_position_1', async (ctx) => {
  ctx.answerCbQuery('Close Successfully')
  ctx.editMessageText(`您可在这里操作您的仓位`, Markup.inlineKeyboard([
    [Markup.button.callback('BTC/USDT 20x (+200NEST)', 'my_position_1')],
    [Markup.button.callback('DOGE/USDT 20x (+200NEST)', 'my_position_2')],
    [Markup.button.callback('XRP/USDT 20x (+200NEST)', 'my_position_3')],
    [Markup.button.url('History', 'https://nestfi.org/'), Markup.button.callback('Back', 'my_copy_1')],
  ]))
})

// Handle logout button click
bot.action('my_unauthorize', async (ctx) => {
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