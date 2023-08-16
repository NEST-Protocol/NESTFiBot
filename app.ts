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
    const code = ctx.startPayload;

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
        // TODO
        const isKol = true;
        if (isKol) {
          // TODO
          ctx.reply(`Would you like to copy Trader 👤 Peter Mason's positions immediately?`, Markup.inlineKeyboard([
            [Markup.button.callback('Nope, I change my mind.', 'cb_menu')],
            [Markup.button.callback('Yes, copy now!', 'cb_copy_setting_KL1')],
          ]))
        } else {
          ctx.reply(`💢 *Invalid Trader*
          
This person is not on the NESTFi Traders list.
Please select other traders on NESTFi.`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.url('Access NESTFi Website', 'https://nestfi.org/')]
            ])
          })
        }
      } else {
        const data = await fetch(`https://dev.nestfi.net/nestfi/copy/follower/position/info?chainId=97`, {
          headers: {
            'Authorization': jwt
          }
        }).then((res) => res.json())
        // @ts-ignore
        const assets = data?.value?.assets || 0
        // @ts-ignore
        const unRealizedPnl = data?.value?.unRealizedPnl || 0
        // @ts-ignore
        const profit = data?.value?.profit || 0
        ctx.reply(`📊 *My Trades*

*Copy trading assets*: ${assets} NEST
*Profit*: ${profit} NEST
*Unrealized PNL*: ${unRealizedPnl} NEST
*Address*: ${address}
`, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('My Account', 'cb_account')],
            [Markup.button.callback('My Copy Trading', 'cb_kls_p_1')],
            [Markup.button.callback('View My Copy Trading', 'cb_ps_all_1')],
          ])
        })
      }
    } else {
      if (code && isAddress(code)) {
        ctx.reply(`👩‍💻 Once you've linked your wallet, click "Copy Now" to continue with the copy trading.`, Markup.inlineKeyboard([
          [Markup.button.callback(`Copy Now`, `https://t.me/nestfi.org?start=${code}`)],
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
      ctx.reply(`👩 *Link Wallet*
      
Hi there, before copying trading, please link your wallet on NESTFi.

👇 Note: The link is valid for 10 minutes.`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('PC ➜ Link My Wallet', `https://connect.nestfi.org/${nonce}`)],
          [Markup.button.url('Mobile ➜ Link My Wallet', `https://metamask.app.link/dapp/connect.nestfi.org/${nonce}`)],
        ])
      })
    }
  } catch (e) {
    ctx.reply(`Something went wrong.`)
    console.log(e)
  }
});

bot.help((ctx) => {
  ctx.reply(`🌏 For further information, please acces nestfi.org

👇 Control me by sending these commands:

/account - Welcome to NESTFi
/unauthorize - Cancel my authorization
/cancel - Cancel the current Operation 
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
      const data = await fetch(`https://dev.nestfi.net/nestfi/copy/follower/position/info?chainId=97`, {
        headers: {
          'Authorization': jwt
        }
      }).then((res) => res.json())
      // @ts-ignore
      const assets = data?.value?.assets || 0
      // @ts-ignore
      const unRealizedPnl = data?.value?.unRealizedPnl || 0
      // @ts-ignore
      const profit = data?.value?.profit || 0
      ctx.reply(`📊 *My Trades*

*Copy trading assets*: ${assets} NEST
*Profit*: ${profit} NEST
*Unrealized PNL*: ${unRealizedPnl} NEST
*Address*: ${address}
`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('My Account', 'cb_account')],
          [Markup.button.callback('My Copy Trading', 'cb_kls_p_1')],
          [Markup.button.callback('View My Copy Trading', 'cb_ps_all_1')],
        ])
      })
    } else {
      ctx.reply(`Hi here! Please authorize me to set up a NESTFi integration. 
      
*You can use command*: /start`, {
        parse_mode: 'Markdown',
      })
    }
  } catch (e) {
    ctx.reply(`Something went wrong.`)
    console.log(e)
  }
})

// Stop command use to delete authorization request
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
        [Markup.button.callback('Yes, deauthorize now.', 'cb_unauthorize')],
        [Markup.button.callback('Nope, I change my mind.', 'cb_menu')],
      ])
    })
  } else {
    ctx.reply('👩‍💻 You have not authorized any wallet yet.')
  }
})

bot.command('cancel', async (ctx) => {
  const user = ctx.from;
  await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/del/intent:${user.id}`, {
    method: 'POST',
    headers: {
      "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
    },
  })
  ctx.reply('Cancel the current operation successfully! /help')
})

// 设置跟单参数
bot.action(/cb_copy_setting_.*/, async (ctx) => {
  const user = ctx.update.callback_query.from;
  const kl = ctx.match[1]
  try {
    // TODO, get user balance of NEST

    // TODO，balance 为可支配余额 + 已划转余额
    const balance = 2000
    // 如果余额不足，则提示充值
    if (balance < 200) {
      ctx.reply(`💔 *Insufficient Balance*
      
Your account balance is insufficient. Please deposit first to initiate lightning trading on NESTFi.`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('Deposit', 'https://nestfi.org/')],
          [Markup.button.callback('Completed, go on!', 'cb_copy_setting_KL1')],
        ])
      })
      return
    } else {
      // 暂存用户的输入意图，为输入total balance, 有效期10分钟
      await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/intent:${user.id}?EX=600`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
        },
        body: JSON.stringify({
          category: 'cb_copy_setting',
          value: {
            kl: kl, // 跟单KL地址
            total: 0, // 总金额
            single: 0, // 单笔金额
            balance: 2000, // 缓存的可用账户余额
          }
        })
      })
      let choice = [0, 0, 0];
      choice[0] = Math.floor(balance * 0.5 / 50) * 50;
      choice[1] = Math.floor(balance * 0.75 / 50) * 50;
      choice[2] = Math.floor(balance / 50) * 50;
      ctx.reply(`💵 *Copy Trading Total Amount*
      
 👤 Peter Mason
My Account Balance: 0 NEST
Copy Trading Total Amount: 4000 NEST

👇 Please confirm the amount you invest to this trader.`, {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
          choice.filter((i) => i >= 200).map((i: number) => String(i)),
        ]).oneTime().resize()
      })
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

bot.action('cb_menu', async (ctx) => {
  const user = ctx.update.callback_query.from;

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
      const data = await fetch(`https://dev.nestfi.net/nestfi/copy/follower/position/info?chainId=97`, {
        headers: {
          'Authorization': jwt
        }
      }).then((res) => res.json())
      // @ts-ignore
      const assets = data?.value?.assets || '-'
      // @ts-ignore
      const unRealizedPnl = data?.value?.unRealizedPnl || '-'
      // @ts-ignore
      const profit = data?.value?.profit || '-'

      ctx.editMessageText(`📊 *My Trades*
  
*Copy trading assets*: ${assets} NEST
*Profit*: ${profit} NEST
*Unrealized PNL*: ${unRealizedPnl} NEST
*Address*: ${address}
`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('My Account', 'cb_account')],
          [Markup.button.callback('My Copy Trading', 'cb_kls_p_1')],
          [Markup.button.callback('View My Copy Trading', 'cb_ps_all_1')],
        ])
      })
    } else {
      ctx.reply(`Hi ${user.username}! Please authorize me to set up a NESTFi integration.

*You can use command*: /start`, {
        parse_mode: 'Markdown',
      })
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

bot.action('cb_account', async (ctx) => {
  const user = ctx.update.callback_query.from;
  try {
    const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${user.id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
      }
    })
      .then(response => response.json())
      .then((data: any) => data.result)

    if (jwt) {
      ctx.editMessageText(`💸 Account Balance: xxx NEST`, Markup.inlineKeyboard([
        [Markup.button.url('Deposit', 'https://nestfi.org/')],
        [Markup.button.url('Withdraw', 'https://nestfi.org/')],
        [Markup.button.callback('« Back', 'cb_menu')],
      ]))
    } else {
      ctx.editMessageText(`Hi ${user.username}! Please authorize me to set up a NESTFi integration.

*You can use command*: /start`, {
        parse_mode: 'Markdown',
      })
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

// 查看所有的跟单人员，跟页码，默认是0
// cb_kls_p_[PAGE]
bot.action(/cb_kls_p_.*/, async (ctx) => {
  const page = ctx.match[1]
  const user = ctx.update.callback_query.from;
  try {
    const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${user.id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
      }
    })
      .then(response => response.json())
      .then((data: any) => data.result)
    if (jwt) {
      ctx.editMessageText(`💪 *My Copy Traders*

These are the traders you follow, together with your investment amount.`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('交易员1: 1000 NEST', 'cb_kl_KL1')],
          [Markup.button.callback('交易员2: 2000 NEST', 'cb_kl_KL2')],
          [Markup.button.callback('« Back', 'cb_menu')],
        ])
      })
    } else {
      ctx.editMessageText(`Hi ${user.username}! Please authorize me to set up a NESTFi integration.

*You can use command*: /start`, {
        parse_mode: 'Markdown',
      })
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

// 查看某个KL
// cb_kl_[KL]
bot.action(/cb_kl_.*/, async (ctx) => {
  // const kl = ctx.match[1]
  try {
    ctx.editMessageText(`👤
    
*Profit sharing*: x%
*Flowers*: x
*AUM*: x NEST
*7D ROI*: x%
*7D Earnings*: x NEST
*7D Flowers PnL*: x NEST
`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('View Copy Trading', 'cb_ps_KL1_0')],
        [Markup.button.callback('Stop Copying', 'cb_r_stop_kl_KL1'), Markup.button.callback('Settings', 'cb_copy_setting_KL1')],
        [Markup.button.callback('« Back', 'cb_kls_p_1')]
      ])
    })
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

// 查看某个KL下面的所有当前的仓位
// cb_ps_[KL]_[PAGE]
bot.action(/cb_ps_.*/, async (ctx) => {
  // const kl = ctx.match[1].split('_')[0]
  try {
    // const page = ctx.match[1].split('_')[1]
    ctx.editMessageText(`👩‍💻 *Current Copy Trading Position*
    
=============================
1. BTC/USDT Long 20x
   Actual Margin：6418.25 NEST +14.99%
   Open Price: 1418.25 USDT
   Open Time：04-15 10:18:15
=============================
2. BTC/USDT Long 20x
   Actual Margin：2400 NEST +20.99%
   Open Price: 1898.25 USDT
   Open Time：04-15 12:00:00
=============================
3. BTC/USDT Long 20x
   Actual Margin：2400 NEST +20.99%
   Open Price: 1898.25 USDT
   Open Time：04-15 12:00:00
=============================
4. BTC/USDT Long 20x
   Actual Margin：2400 NEST +20.99%
   Open Price: 1898.25 USDT
   Open Time：04-15 12:00:00
=============================
5. BTC/USDT Long 20x
   Actual Margin：2400 NEST +20.99%
   Open Price: 1898.25 USDT
   Open Time：04-15 12:00:00
  `, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('1', 'cb_oi_1'), Markup.button.callback('2', 'cb_oi_2'), Markup.button.callback('3', 'cb_oi_3'), Markup.button.callback('4', 'cb_oi_1'), Markup.button.callback('5', 'cb_oi_2')],
        [Markup.button.callback('History', 'cb_klh_KL1_1'), Markup.button.callback('« Back', 'cb_kl_KL1')],
      ])
    })
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

bot.action(/cb_klh_.*/, async (ctx) => {
  // const kl = ctx.match[1].split('_')[0]
  // const page = ctx.match[1].split('_')[1]
  try {
    ctx.editMessageText(`🧩 *History*

*BTC/USDT Long 20x*
*Actual Margin*: 6418.25 NEST +14.99%
*Open Price*: 1418.25 USDT
*Close Price*: 1320.99 USDT
*Liq Price*: 1400.00 USDT
*Open Time*: 04-15 10:18:15
*Close Time*: 04-15 10:18:15
`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('» Next Page', `cb_klh_KL1_2`)],
        [Markup.button.callback('« Back', 'cb_ps_KL1_1')],
      ])
    })
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

bot.action(/cb_r_stop_kl_.*/, async (ctx) => {
  try {
    ctx.editMessageText(`🙅 *Stop Copying*
    
*Total Copy Amount*: 6000 NEST
*Open Interest*: 5000 NEST
*Total Profit*: 6900 NEST

End copy will liquidate your position with market orders, and automatically return the assets to your Account after deducting the profits sharing.

❓ Are you sure to stop copying?
    `, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Nope, I change my mind', `cb_kl_KL1`)],
        [Markup.button.callback('Yes, stop copying trading', `cb_stop_kl_KL1`)],
      ])
    })
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

bot.action(/cb_stop_kl_.*/, async (ctx) => {
  try {
    ctx.editMessageText(`👩‍💻 *Current Copy Trading Position*
    
=============================
1. BTC/USDT Long 20x
   Actual Margin：6418.25 NEST +14.99%
   Open Price: 1418.25 USDT
   Open Time：04-15 10:18:15
=============================
2. BTC/USDT Long 20x
   Actual Margin：2400 NEST +20.99%
   Open Price: 1898.25 USDT
   Open Time：04-15 12:00:00
=============================
3. BTC/USDT Long 20x
   Actual Margin：2400 NEST +20.99%
   Open Price: 1898.25 USDT
   Open Time：04-15 12:00:00
=============================
4. BTC/USDT Long 20x
   Actual Margin：2400 NEST +20.99%
   Open Price: 1898.25 USDT
   Open Time：04-15 12:00:00
=============================
5. BTC/USDT Long 20x
   Actual Margin：2400 NEST +20.99%
   Open Price: 1898.25 USDT
   Open Time：04-15 12:00:00
  `, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('1', 'cb_oi_1'), Markup.button.callback('2', 'cb_oi_2'), Markup.button.callback('3', 'cb_oi_3'), Markup.button.callback('4', 'cb_oi_1'), Markup.button.callback('5', 'cb_oi_2')],
        [Markup.button.callback('History', 'cb_klh_KL1_1'), Markup.button.callback('« Back', 'cb_kl_KL1')],
      ])
    })
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

// 我的仓位
// cb_po_[ORDER_INDEX]
bot.action(/cb_oi_.*/, async (ctx) => {
  const order_index = ctx.match[1]
  try {
    ctx.editMessageText(`🍯 *Position*
    
*BTC/USDT Long 20x*
*Actual Margin*: 6418.25 NEST +14.99%
*Open Price*: 1418.25 USDT
*Market Price*: 1320.99 USDT
*Liq Price*: 1400.00 USDT
*Open Time*: 04-15 10:18:15
`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Close the Position', 'cb_close_oi_1')],
        [Markup.button.callback('« Back', 'cb_ps_KL_1')],
      ])
    })
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

// 关闭订单
// cb_close_oi_[ORDER_INDEX]
bot.action(/cb_close_oi_.*/, async (ctx) => {
  const order_index = ctx.match[1]
  try {
    ctx.answerCbQuery('Close Successfully')
    ctx.editMessageText(`👩‍💻 *Current Copy Trading Position*
    
=============================
1. BTC/USDT Long 20x
   Actual Margin：6418.25 NEST +14.99%
   Open Price: 1418.25 USDT
   Open Time：04-15 10:18:15
=============================
2. BTC/USDT Long 20x
   Actual Margin：2400 NEST +20.99%
   Open Price: 1898.25 USDT
   Open Time：04-15 12:00:00
=============================
3. BTC/USDT Long 20x
   Actual Margin：2400 NEST +20.99%
   Open Price: 1898.25 USDT
   Open Time：04-15 12:00:00
=============================
4. BTC/USDT Long 20x
   Actual Margin：2400 NEST +20.99%
   Open Price: 1898.25 USDT
   Open Time：04-15 12:00:00
=============================
5. BTC/USDT Long 20x
   Actual Margin：2400 NEST +20.99%
   Open Price: 1898.25 USDT
   Open Time：04-15 12:00:00
  `, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('1', 'cb_oi_1'), Markup.button.callback('2', 'cb_oi_2'), Markup.button.callback('3', 'cb_oi_3'), Markup.button.callback('4', 'cb_oi_1'), Markup.button.callback('5', 'cb_oi_2')],
        [Markup.button.callback('History', 'cb_klh_KL1_1'), Markup.button.callback('« Back', 'cb_kl_KL1')],
      ])
    })
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

// Handle logout button click
bot.action('cb_unauthorize', async (ctx) => {
  const user = ctx.update.callback_query.from;
  try {
    await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/del/auth:${user.id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
      }
    })
    ctx.editMessageText('👩‍💻 You have successfully deauthorized the NESTFi Copy Trading bot on NESTFi.', Markup.inlineKeyboard([]))
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

bot.action('confirm_copy_setting', async (ctx) => {
  const user = ctx.update.callback_query.from;
  // 查询用户意图
  try {
    const intent = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/intent:${user.id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
      }
    })
      .then(response => response.json())
      .then((data: any) => data.result)

    if (intent) {
      const data = JSON.parse(intent)
      if (data.category === 'cb_copy_setting') {
        let {kl, total, single, balance} = data.value
        // TODO: 调用接口
        ctx.editMessageText(`Copy trading successful!`, Markup.inlineKeyboard([]))
      } else {
        ctx.editMessageText('Sorry, we have not found your copy trading request', {
          ...Markup.inlineKeyboard([]),
        })
      }
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

bot.action('cancel_copy_setting', async (ctx) => {
  const user = ctx.update.callback_query.from;
  try {
    await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/del/intent:${user.id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
      },
    });
    ctx.editMessageText(`🙅‍♂️ Alright, we have cancelled your copy trading request!`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([]),
    })
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

bot.on("message", async (ctx) => {
  const user = ctx.update.message.from;
  const input = ctx.message.text;
  const intent = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/intent:${user.id}`, {
    headers: {
      "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
    }
  })
    .then(response => response.json())
    .then((data: any) => data.result)
  // 如果有意图，匹配是否符合规则
  if (intent) {
    const data = JSON.parse(intent)
    if (data.category === 'cb_copy_setting') {
      let {kl, total, single, balance} = data.value
      if (total === 0) {
        if (Number(input) < 200 || Number(input) > balance) {
          ctx.reply(`💢 *Invalid Amount*
          
Please enter a valid amount between 200 and your account balance.`, {
            parse_mode: 'Markdown',
          })
          return
        }
        // 更新intent
        await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/intent:${user.id}?EX=600`, {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
          },
          body: JSON.stringify({
            category: 'cb_copy_setting',
            value: {
              ...data.value,
              total: Number(input),
            }
          })
        })
        let choice = [0, 0, 0]
        choice[0] = Math.floor(Number(input) * 0.1 / 50) * 50
        choice[1] = Math.floor(Number(input) * 0.2 / 50) * 50
        choice[2] = Math.floor(Number(input) * 0.4 / 50) * 50
        ctx.reply('Enter the amount for a single copy, minimum 50 NEST.', Markup.keyboard([
          choice.filter((i) => i >= 50).map(i => String(i))
        ]).oneTime().resize())
      } else if (single === 0) {
        if (Number(input) < 50 || Number(input) > total) {
          let choice = [0, 0, 0]
          choice[0] = Math.floor(total * 0.1 / 50) * 50
          choice[1] = Math.floor(total * 0.2 / 50) * 50
          choice[2] = Math.floor(total * 0.4 / 50) * 50
          ctx.reply(`💢 *Invalid Amount*
          
Please enter a valid amount between 50 and your CopyTrading Total Amount.`, {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
              choice.filter((i) => i >= 50).map(i => String(i))
            ])
          })
          return
        }
        await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/intent:${user.id}?EX=600`, {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
          },
          body: JSON.stringify({
            category: 'cb_copy_setting',
            value: {
              ...data.value,
              single: Number(input),
            }
          })
        })
        ctx.reply(`👩‍💻 *Confirm*
        
👤 Peter Mason
Copy Trading Total Amount: ${total} NEST 
Copy Trading Each Order: ${Number(input)} NEST 

Are you sure?`, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('Yes, I’m sure.', 'confirm_copy_setting')],
            [Markup.button.callback('Nope, I change my mind.', 'cancel_copy_setting')]
          ])
        })
      }
      return
    } else {
      // nothing
    }
  }

  // 发送指定的回复

})

export const handler = http(bot.webhookCallback("/bot"));