import http from "serverless-http";
import {Markup, Telegraf} from "telegraf";
import fetch from "node-fetch";
import {isAddress} from "ethers";

const token = process.env.BOT_TOKEN!;
const bot = new Telegraf(token);
const chainId = 97;
const hostname = 'https://dev.nestfi.net'

bot.start(async (ctx) => {
  const from = ctx.from;
  try {
    const klAddress = ctx.startPayload;

    const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${from.id}`, {
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

      if (klAddress && isAddress(klAddress)) {
        const isKol = await fetch(`${hostname}/nestfi/copy/kol/isKol?walletAddress=${klAddress}`, {
          headers: {
            'Authorization': jwt
          }
        }).then(res => res.json())
          // @ts-ignore
          .then(data => data?.value || false)
        if (isKol) {
          const data = await fetch(`${hostname}/nestfi/copy/kol/info?chainId=${chainId}&walletAddress=${klAddress}`, {
            headers: {
              'Authorization': jwt
            }
          }).then(res => res.json())
          // @ts-ignore
          const nickName = data?.value?.nickName || 'No name'
          const isFollowed = await fetch(`${hostname}/nestfi/copy/follower/kolList?chainId=${chainId}`, {
            headers: {
              'Authorization': jwt
            }
          }).then(res => res.json())
            // @ts-ignore
            .then(data => data?.value?.filter((item: any) => item.walletAddress.toLowerCase() === klAddress.toLowerCase()).length > 0 || false )

          if (!isFollowed) {
            await fetch(`${hostname}/nestfi/copy/follower/setting`, {
              method: 'POST',
              headers: {
                'Authorization': jwt,
                'Content-Type': 'application/json',
                'token': `${Math.ceil(Date.now() / 1000)}`
              },
              body: JSON.stringify({
                chainId: chainId,
                copyAccountBalance: 0,
                copyKolAddress: klAddress,
                follow: false,
                followingMethod: "FIEXD",
                followingValue: 0
              })
            })
            ctx.reply(`Would you like to copy Trader 👤 ${nickName}'s positions immediately?`, Markup.inlineKeyboard([
              [Markup.button.callback('Nope, I change my mind.', 'cb_menu')],
              [Markup.button.callback('Yes, copy now!', `cb_copy_setting_${klAddress}`)],
            ]))
          } else {
            ctx.reply(`You have already followed this trader. All positions from this trader will be automatically executed for you.`, Markup.inlineKeyboard([
              [Markup.button.callback('Settings', `cb_copy_setting_${klAddress}`)],
              [Markup.button.callback('« Back', 'cb_menu')],
            ]))
          }
        } else {
          ctx.reply(`💢 Invalid Trader
———————————————
Peter Mason is not on the NESTFi traders list.
Please select other traders on NESTFi.`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.url('Access NESTFi Website', 'https://nestfi.org/')]
            ])
          })
        }
      } else {
        const data = await fetch(`${hostname}/nestfi/copy/follower/position/info?chainId=${chainId}`, {
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
        ctx.reply(`📊 My Trades
————————————————————
Copy Trading Total Amount: ${assets.toFixed(2)} NEST
Profit: ${profit.toFixed(2)} NEST
Unrealized PnL: ${unRealizedPnl.toFixed(2)} NEST
Address: ${address}
`, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('My Account', 'cb_account')],
            [Markup.button.callback('My Traders', 'cb_kls_p_1')],
            [Markup.button.callback('My Copy Trading', 'cb_ps_all_1')],
          ])
        })
      }
    } else {
      if (klAddress && isAddress(klAddress)) {
        ctx.reply(`👩‍💻 Once you've linked your wallet, click "Copy Now" to continue with the copy trading.`, Markup.inlineKeyboard([
          [Markup.button.url(`Copy Now`, `https://t.me/nestfi.org?start=${klAddress}`)],
        ]))
      }
      const nonce = Math.random().toString(36).substring(2, 18);
      const message = await ctx.reply(`👛 Link Wallet
————————————————————
Hi there, before copying trading, please link your wallet on NESTFi.

👇Note: The link is valid for 10 minutes.`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('PC ➜ Link My Wallet', `https://connect.nestfi.org/${nonce}`)],
          [Markup.button.url('Mobile ➜ Link My Wallet', `https://metamask.app.link/dapp/connect.nestfi.org/${nonce}`)],
        ])
      })
      const message_id = message.message_id
      await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/code:${nonce}?EX=600`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
        },
        body: JSON.stringify({
          message_id: message_id,
          user: from,
        })
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
/help - How to use?`, {
    parse_mode: 'Markdown'
  })
});

bot.command('account', async (ctx) => {
  const from = ctx.from;
  const message_id = ctx.message.message_id;
  try {
    const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${from.id}`, {
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
      const data = await fetch(`${hostname}/nestfi/copy/follower/position/info?chainId=${chainId}`, {
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
      ctx.reply(`📊 My Trades
————————————————————
Copy Trading Total Amount: ${assets.toFixed(2)} NEST
Profit: ${profit.toFixed(2)} NEST
Unrealized PnL: ${unRealizedPnl.toFixed(2)} NEST
Address: ${address}
`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('My Account', 'cb_account')],
          [Markup.button.callback('My Traders', 'cb_kls_p_1')],
          [Markup.button.callback('My Copy Trading', 'cb_ps_all_1')],
        ])
      })
    } else {
      ctx.reply(`Hi here! Please authorize me to set up a NESTFi integration. 
      
You can use command: /start`, {
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
  const from = ctx.from;
  const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${from.id}`, {
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
    
Address: ${address}`, {
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
  const from = ctx.from;
  await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/del/intent:${from.id}`, {
    method: 'POST',
    headers: {
      "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
    },
  })
  ctx.reply('Cancel the current operation successfully! /help', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('« Back', 'cb_menu')],
    ]),
    ...Markup.removeKeyboard()
  })
})

// cb_copy_setting_[KL]
bot.action(/cb_copy_setting_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const klAddress = action.split('_')[3]
  try {
    const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${from.id}`, {
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
      const availableBalance = await fetch(`${hostname}/nestfi/op/user/asset?chainId=${chainId}&walletAddress=${address}`, {
        headers: {
          'Authorization': jwt
        }
      }).then(res => res.json())
        // @ts-ignore
        .then(data => data?.value?.availableBalance || 0)
      const positionInfo = await fetch(`${hostname}/nestfi/copy/follower/kolList?chainId=${chainId}`, {
        headers: {
          'Authorization': jwt
        }
      }).then(res => res.json())
        // @ts-ignore
        .then(data => data?.value?.filter((item: any) => item?.walletAddress.toLowerCase() === klAddress.toLowerCase()))
      const klInfo = await fetch(`${hostname}/nestfi/copy/kol/info?chainId=${chainId}&walletAddress=${klAddress}`, {
        headers: {
          'Authorization': jwt
        }
      }).then(res => res.json())
        // @ts-ignore
        .then(data => data.value)

      const position = positionInfo?.[0]?.position || 0
      const nickName = klInfo?.nickName || '-'
      const groupId = klInfo?.groupId || '-'

      const balance = availableBalance + position
      if (balance < 200) {
        ctx.reply(`💔 Insufficient Balance
———————————————
Your account balance is insufficient. Please deposit first to initiate lightning trading on NESTFi.`, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url('Deposit', 'https://nestfi.org/#')],
            [Markup.button.callback('Completed, go on!', 'cb_copy_setting_KL1')],
          ])
        })
        return
      } else {
        await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/intent:${from.id}?EX=600`, {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
          },
          body: JSON.stringify({
            category: 'cb_copy_setting',
            value: {
              kl: klAddress,
              total: 0,
              single: 0,
              availableBalance: availableBalance,
              position: position,
              nickName: nickName,
              groupId: groupId,
            }
          })
        })
        let choice = [0, 0, 0];
        choice[0] = Math.floor(balance * 0.5 / 50) * 50;
        choice[1] = Math.floor(balance * 0.75 / 50) * 50;
        choice[2] = Math.floor(balance / 50) * 50;
        ctx.reply(`💵 Copy Trading Total Amount
————————————————————
My Account Balance: ${availableBalance?.toFixed(2) || 0} NEST${position > 0 ? `\nCopy Trading Total Amount: ${position?.toFixed(2) || 0} NEST` : ''}

Copy ${nickName}
Please type the amount you invest to this trader below.`, {
          parse_mode: 'Markdown',
          ...Markup.keyboard([
            choice.filter((i) => i >= 200).map((i: number) => String(i)),
            ['/cancel'],
          ]).oneTime().resize()
        })
      }
    } else {
      ctx.reply(`Hi here! Please authorize me to set up a NESTFi integration. 
      
You can use command: /start`, {
        parse_mode: 'Markdown',
      })
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

bot.action('cb_menu', async (ctx) => {
  const {from} = ctx.update.callback_query;

  try {
    const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${from.id}`, {
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
      const data = await fetch(`${hostname}/nestfi/copy/follower/position/info?chainId=${chainId}`, {
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

      ctx.editMessageText(`📊 My Trades
————————————————————
Copy Trading Total Amount: ${assets.toFixed(2)} NEST
Profit: ${profit.toFixed(2)} NEST
Unrealized PnL: ${unRealizedPnl.toFixed(2)} NEST
Address: ${address}`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('My Account', 'cb_account')],
          [Markup.button.callback('My Traders', 'cb_kls_p_1')],
          [Markup.button.callback('My Copy Trading', 'cb_ps_all_1')],
        ])
      })
    } else {
      ctx.reply(`Hi ${from.username}! Please authorize me to set up a NESTFi integration.

You can use command: /start`, {
        parse_mode: 'Markdown',
      })
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

bot.action('cb_account', async (ctx) => {
  const {from} = ctx.update.callback_query;
  try {
    const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${from.id}`, {
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
      const data = await fetch(`${hostname}/nestfi/op/user/asset?chainId=${chainId}&walletAddress=${address}`, {
        headers: {
          'Authorization': jwt
        }
      }).then(res => res.json())
      // @ts-ignore
      const copyBalance = data?.value?.copyBalance?.toFixed(2) || 0
      // @ts-ignore
      const availableBalance = data?.value?.availableBalance?.toFixed(2) || 0
      ctx.editMessageText(`💳 My Account
————————————————————
Account Balance: ${availableBalance} NEST
Copy Trading Total Amount: ${copyBalance} NEST
      `, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.url('Deposit', 'https://nestfi.org/')],
          [Markup.button.url('Withdraw', 'https://nestfi.org/')],
          [Markup.button.callback('« Back', 'cb_menu')],
        ])
      })
    } else {
      ctx.editMessageText(`Hi ${from.username}! Please authorize me to set up a NESTFi integration.

You can use command: /start`, {
        parse_mode: 'Markdown',
      })
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

// cb_kls_p_[PAGE]
bot.action(/cb_kls_p_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const page = Number(action.split('_')[3])
  try {
    const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${from.id}`, {
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
      const data = await fetch(`${hostname}/nestfi/copy/follower/kolList?chainId=${chainId}`, {
        headers: {
          'Authorization': jwt
        }
      }).then(res => res.json())
      // @ts-ignore
      const length = data?.value?.length || 0
      let inlineKeyboard: any[] = []
      // @ts-ignore
      const showArray = data?.value.slice((page - 1) * 5, page * 5)
      for (let i = 0; i < showArray.length; i++) {
        // @ts-ignore
        inlineKeyboard.push([Markup.button.callback(`${showArray[i]?.nickName}: ${showArray[i]?.position > 0 ? `${showArray[i]?.position.toFixed(2)} NEST` : `Havent't Started`}`, `cb_kl_${showArray[i]?.walletAddress}`)])
      }
      if (page * 5 < length) {
        inlineKeyboard.push([Markup.button.callback('» Next Page', `cb_kls_p_${page + 1}`)])
      }
      inlineKeyboard.push([Markup.button.callback('« Back', 'cb_menu')])
      ctx.editMessageText(`💪 My Traders
————————————————————
These are the traders you follow, together with your investment amount.
`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(inlineKeyboard)
      })
    } else {
      ctx.editMessageText(`Hi ${from.username}! Please authorize me to set up a NESTFi integration.

You can use command: /start`, {
        parse_mode: 'Markdown',
      })
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

// cb_kl_[KL]
bot.action(/cb_kl_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const klAddress = action.split('_')[2]
  try {
    const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${from.id}`, {
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
      const data = await fetch(`${hostname}/nestfi/copy/kol/info?chainId=${chainId}&walletAddress=${klAddress}`, {
        headers: {
          'Authorization': jwt
        }
      }).then(res => res.json())
      // @ts-ignore
      const currentFollowers = data?.value?.currentFollowers || 0
      // @ts-ignore
      const aum = data?.value?.followersAssets?.toFixed(2) || 0
      // @ts-ignore
      const nickName = data?.value?.nickName || '-'
      // @ts-ignore
      const followerProfitLoss = data?.value?.followerProfitLoss || 0
      // @ts-ignore
      const kolProfitLoss = data?.value.kolProfitLoss || 0
      // @ts-ignore
      const kolProfitLossRate = data?.value.kolProfitLossRate || 0
      // @ts-ignore
      const rewardRatio = (data?.value?.rewardRatio * 100).toFixed(2) || 0

      // @ts-ignore
      ctx.editMessageText(`👤 ${nickName}
————————————————————
Profit sharing: ${rewardRatio}%
Followers: ${currentFollowers}
AUM: ${aum} NEST
7D ROI: ${kolProfitLossRate.toFixed(2)}%
7D Earnings: ${kolProfitLoss.toFixed(2)} NEST
7D Followers PnL: ${followerProfitLoss.toFixed(2)} NEST`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('View Copy Trading', `cb_ps_${klAddress}_1`)],
          [Markup.button.callback('Stop Copying', `cb_r_stop_kl_${klAddress}`), Markup.button.callback('Settings', `cb_copy_setting_${klAddress}`)],
          [Markup.button.callback('« Back', 'cb_kls_p_1')]
        ])
      })
    } else {
      ctx.editMessageText(`Hi ${from.username}! Please authorize me to set up a NESTFi integration.

You can use command: /start`, {
        parse_mode: 'Markdown',
      })
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

// cb_ps_[KL]_[PAGE]
bot.action(/cb_ps_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const klAddress = action.split('_')[2]
  const page = Number(action.split('_')[3])
  try {
    const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${from.id}`, {
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
      let url;
      if (klAddress === "all") {
        url = `${hostname}/nestfi/copy/follower/future/list?chainId=${chainId}`
      } else {
        url = `${hostname}/nestfi/copy/follower/future/list?chainId=${chainId}&copyKolAddress=${klAddress}`
      }
      const data = await fetch(url, {
        headers: {
          'Authorization': jwt
        }
      }).then(res => res.json())
      // @ts-ignore
      const length = data?.value?.length || 0
      // @ts-ignore
      const showData = data?.value?.slice((page - 1) * 5, page * 5)
      let inlineKeyboard: any [] = []
      const buttons = showData.map((item: any, index: number) => (
        Markup.button.callback(`${index + 1 + (page - 1) * 5}`, `cb_oi_${item.id}_${klAddress}`)
      ))
      if (buttons.length > 0) {
        inlineKeyboard.push(buttons)
      }
      if (page * 5 < length) {
        inlineKeyboard.push([Markup.button.callback('» Next Page', `cb_ps_${klAddress}_${page + 1}`)])
      }
      inlineKeyboard.push([Markup.button.callback('History', `cb_klh_${klAddress}_1`), Markup.button.callback('« Back', klAddress === 'all' ? 'cb_menu' : `cb_kl_${klAddress}`)])
      ctx.editMessageText(`🎯 Current Copy Trading Position
${showData.length > 0 ? `${showData.map((item: any, index: number) => (`
=============================
${index + 1 + (page - 1) * 5}. ${item?.product || '-'} ${item?.direction ? 'Long' : 'Short'} ${item?.leverage || '-'}x
   Actual Margin: ${item?.margin?.toFixed(2)} NEST ${item?.profitLossRate > 0 ? `+${item?.profitLossRate?.toFixed(2)}` : item?.profitLossRate?.toFixed(2)}%
   Open Price: ${item?.orderPrice?.toFixed(2)} USDT
   Open: UTC${new Date(item?.timestamp * 1000 || 0).toISOString().replace('T', ' ').substring(5, 19)}`)).join('')}\n👇 Click the number to manage the corresponding order.` : '\nNo copy trading position yet!'}`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(inlineKeyboard)
      })
    } else {
      ctx.editMessageText(`Hi ${from.username}! Please authorize me to set up a NESTFi integration.

You can use command: /start`, {
        parse_mode: 'Markdown',
      })
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

// cb_klh_[KL]_[PAGE]
bot.action(/cb_klh_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const klAddress = action.split('_')[2]
  const page = Number(action.split('_')[3])
  try {
    const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${from.id}`, {
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
      let url;
      if (klAddress === "all") {
        url = `${hostname}/nestfi/copy/follower/future/history?chainId=${chainId}`
      } else {
        url = `${hostname}/nestfi/copy/follower/future/history?chainId=${chainId}&copyKolAddress=${klAddress}`
      }
      const data = await fetch(url, {
        headers: {
          'Authorization': jwt
        }
      }).then(res => res.json())
      // @ts-ignore
      const length = data?.value?.length || 0
      // @ts-ignore
      const showData = data?.value?.slice((page - 1) * 5, page * 5)
      let inlineKeyboard: any [] = []
      if (page * 5 < length) {
        inlineKeyboard.push([Markup.button.callback('» Next Page', `cb_klh_${klAddress}_${page + 1}`)])
      }
      inlineKeyboard.push([Markup.button.callback('« Back', `cb_ps_${klAddress}_1`)])
      ctx.editMessageText(`🧩 History
${showData?.length > 0 ? `${showData?.map((item: any, index: number) => (`
=============================
${index + 1 + (page - 1) * 5}. ${item?.product || '-'} ${item?.direction ? 'Long' : 'Short'} ${item?.leverage || '-'}x
   Actual Margin: ${item?.margin?.toFixed(2)} NEST ${item?.profitLossRate > 0 ? `+${item?.profitLossRate?.toFixed(2)}` : item?.profitLossRate?.toFixed(2)}%
   Open Price: ${item?.openPrice?.toFixed(2)} USDT
   Close price: ${item?.closePrice?.toFixed(2)} USDT
   Liq Price: ${item?.lipPrice?.toFixed(2)} USDT
   Open: UTC${new Date(item?.openTime * 1000 || 0).toISOString().replace('T', ' ').substring(5, 19)}
   Close: UTC${new Date(item?.closeTime * 1000 || 0).toISOString().replace('T', ' ').substring(5, 19)}`)).join('')}` : '\nNo copy trading position yet!'}`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(inlineKeyboard)
      })
    } else {
      ctx.editMessageText(`Hi ${from.username}! Please authorize me to set up a NESTFi integration.

You can use command: /start`, {
        parse_mode: 'Markdown',
      })
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

// cb_r_stop_kl_[KL]
bot.action(/cb_r_stop_kl_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const klAddress = action.split('_')[4]
  try {
    const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${from.id}`, {
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
      const request = await fetch(`${hostname}/nestfi/copy/follower/future/info?chainId=${chainId}&copyKolAddress=${klAddress}`, {
        headers: {
          'Authorization': jwt
        }
      }).then((res) => res.json())
        // @ts-ignore
        .then(data => data?.value)

      ctx.editMessageText(`🙅 Stop Copying
————————————————————
Total Copy Amount: ${request ? request?.totalCopyAmount?.toFixed(2) : '-'} NEST
Open Interest: ${request ? request?.openInterest?.toFixed(2) : '-'} NEST
Total Profit: ${request ? request?.totalProfit?.toFixed(2) : '-'} NEST

_End copy will liquidate your position with market orders, and automatically return the assets to your Account after deducting the profits sharing._

❓Are you sure to stop copying?`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('Nope, I change my mind.', `cb_kl_${klAddress}`)],
          [Markup.button.callback('Yes, stop copying trading.', `cb_stop_kl_${klAddress}`)],
        ])
      })
    } else {
      ctx.editMessageText(`Hi ${from.username}! Please authorize me to set up a NESTFi integration.

You can use command: /start`, {
        parse_mode: 'Markdown',
      })
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

// cb_stop_kl_[KL]
bot.action(/cb_stop_kl_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const klAddress = action.split('_')[3]
  try {
    const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${from.id}`, {
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
      const data = await fetch(`${hostname}/nestfi/copy/follower/cancle?chainId=${chainId}&copyKolAddress=${klAddress}`, {
        method: 'POST',
        headers: {
          "Authorization": jwt,
          "token": `${Math.ceil(Date.now() / 1000)}`,
        }
      }).then(res => res.json())
      // @ts-ignore
      const status = data?.value || false
      if (status) {
        ctx.editMessageText(`🥳 Stop Copying Successfully!`, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('« Back', 'cb_kls_p_1')],
          ])
        })
      } else {
        ctx.answerCbQuery('Something went wrong.')
      }
    } else {
      ctx.editMessageText(`Hi ${from.username}! Please authorize me to set up a NESTFi integration.

You can use command: /start`, {
        parse_mode: 'Markdown',
      })
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

// cb_po_[ORDER_INDEX]_[KL]
bot.action(/cb_oi_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const oi = action.split('_')[2]
  const klAddress = action.split('_')[3]
  try {
    const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${from.id}`, {
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

      const data = await fetch(`${hostname}/nestfi/op/future/getById/${oi}`, {
        headers: {
          'Authorization': jwt,
        }
      }).then(res => res.json())

      // @ts-ignore
      const product = data?.value?.product || '-'
      // @ts-ignore
      const direction = data?.value?.direction ? 'Long' : 'Short'
      // @ts-ignore
      const leverage = data?.value?.leverage || '-'
      // @ts-ignore
      const margin = data?.value?.margin.toFixed(2) || '0'
      // @ts-ignore
      const orderPrice = data?.value?.orderPrice.toFixed(2) || '-'
      // @ts-ignore
      const marketPrice = data?.value?.marketPrice.toFixed(2) || '-'
      // @ts-ignore
      const openTime = new Date(data?.value?.timestamp * 1000 || 0).toISOString().replace('T', ' ').substring(5, 19)
      // @ts-ignore
      const profitLossRate = data?.value?.profitLossRate?.toFixed(2) || '-'
      // @ts-ignore
      const liqPrice = data?.value?.lipPrice?.toFixed(2) || '-'

      ctx.editMessageText(`🍯 Position ${oi}
————————————————————
${product} ${direction} ${leverage}x
Actual Margin: ${margin} NEST ${profitLossRate > 0 ? `+${profitLossRate}` : profitLossRate}%
Open Price: ${orderPrice} USDT
Market Price: ${marketPrice} USDT
Liq Price: ${liqPrice} USDT
Open: UTC${openTime}`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('Close the Position', `cb_close_oi_${oi}_${klAddress}`)],
          [Markup.button.callback('« Back', `cb_ps_${klAddress}_1`)],
        ])
      })
    } else {
      ctx.editMessageText(`Hi ${from.username}! Please authorize me to set up a NESTFi integration.

You can use command: /start`, {
        parse_mode: 'Markdown',
      })
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

// cb_close_oi_[ORDER_INDEX]_[KL]
bot.action(/cb_close_oi_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const oi = action.split('_')[3]
  const klAddress = action.split('_')[4]
  try {
    const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${from.id}`, {
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
      const page = 1
      const request = await fetch(`${hostname}/nestfi/op/future/close?id=${oi}`, {
        method: 'POST',
        headers: {
          'Authorization': jwt,
          'token': `${Math.ceil(Date.now() / 1000)}`,
        }
      }).then(res => res.json())
        // @ts-ignore
        .then(data => data?.value || false)

      if (request) {
        ctx.editMessageText('🥳 Close Position Successfully!', {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('« Back' , `cb_ps_${klAddress}_1`)]
          ])
        })
      } else {
        ctx.answerCbQuery('Something went wrong.')
      }
    } else {
      ctx.editMessageText(`Hi ${from.username}! Please authorize me to set up a NESTFi integration.

You can use command: /start`, {
        parse_mode: 'Markdown',
      })
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

// Handle logout button click
bot.action('cb_unauthorize', async (ctx) => {
  const {from} = ctx.update.callback_query;
  try {
    await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/del/auth:${from.id}`, {
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
  const {from} = ctx.update.callback_query;
  try {
    const intent = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/intent:${from.id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
      }
    })
      .then(response => response.json())
      .then((data: any) => data.result)

    if (intent) {
      const data = JSON.parse(intent)
      if (data?.category === 'cb_copy_setting') {
        const jwt = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/auth:${from.id}`, {
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

          // @ts-ignore
          const {kl, total, single, nickName, availableBalance, position, groupId} = data.value
          const request = await fetch(`${hostname}/nestfi/copy/follower/setting`, {
            method: 'POST',
            headers: {
              'Authorization': jwt,
              'token': `${Math.ceil(Date.now() / 1000)}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chainId: chainId,
              copyAccountBalance: total,
              copyKolAddress: kl,
              follow: true,
              followingMethod: "FIEXD",
              followingValue: single,
            })
          }).then(res => res.json())
            // @ts-ignore
            .then(data => data?.value || false)

          if (request) {
            ctx.editMessageText(`🥳 Successfully Copy Trading
————————————————————
More latest orders from ${nickName} will be posted in the group.

Telegram Group: ${groupId}`, {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [Markup.button.callback('« Back', 'cb_menu')],
              ])
            })
          } else {
            ctx.answerCbQuery('Something went wrong.')
          }
        } else {
          ctx.editMessageText(`Hi ${from.username}! Please authorize me to set up a NESTFi integration.

You can use command: /start`, {
            parse_mode: 'Markdown',
          })
        }
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
  const {from} = ctx.update.callback_query;
  try {
    await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/del/intent:${from.id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
      },
    });
    ctx.editMessageText(`🙅‍️ Alright, your copy trading request has been cancelled successfully!`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('« Back', 'cb_menu')],
      ]),
    })
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

bot.on("message", async (ctx) => {
  const {from} = ctx.update.message;
  // @ts-ignore
  const input = ctx.message.text;
  const intent = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/intent:${from.id}`, {
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
      let {kl, total, single, availableBalance, position, nickName} = data.value
      if (total === 0) {
        if (Number(input) < Math.max(200, position) || Number(input) > availableBalance) {
          ctx.reply(`💢 Invalid Amount
Please enter a valid amount between ${Math.max(200, position)} and your account balance, ${availableBalance}`, {
            parse_mode: 'Markdown',
          })
          return
        }
        // 更新intent
        await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/intent:${from.id}?EX=600`, {
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
        ctx.reply(`💵 Copy Trading Each Order
————————————————————
Copy ${nickName}
Please type the amount you invest to this trader for each order below.
`, {
          parse_mode: 'Markdown',
          ...Markup.keyboard([
            choice.filter((i) => i >= 50).map(i => String(i)),
            ['/cancel'],
          ]).oneTime().resize()
        })
      } else if (single === 0) {
        if (Number(input) < 50 || Number(input) > total) {
          let choice = [0, 0, 0]
          choice[0] = Math.floor(total * 0.1 / 50) * 50
          choice[1] = Math.floor(total * 0.2 / 50) * 50
          choice[2] = Math.floor(total * 0.4 / 50) * 50
          ctx.reply(`💢 Invalid Amount
Please enter a valid amount between 50 and your CopyTrading Total Amount, ${total}`, {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
              choice.filter((i) => i >= 50).map(i => String(i)),
              ['/cancel'],
            ])
          })
          return
        }
        await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/intent:${from.id}?EX=600`, {
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
        ctx.reply(`👩‍💻 Confirm
————————————————————
Copy Trading Total Amount: ${total} NEST 
Copy Trading Each Order: ${input} NEST 

Copy ${nickName}
Are you sure?`, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('Yes, I’m sure.', 'confirm_copy_setting')],
            [Markup.button.callback('Nope, I change my mind.', 'cancel_copy_setting')]
          ])
        })
      }
      return
    }
  }
})

export const handler = http(bot.webhookCallback("/bot"));