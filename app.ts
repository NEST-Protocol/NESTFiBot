import http from "serverless-http";
import {Markup, Telegraf} from "telegraf";
import {isAddress} from "ethers";
import i18n from "i18n";
import {Redis} from "@upstash/redis/with-fetch";

const token = process.env.BOT_TOKEN!;
const bot = new Telegraf(token);
const chainId = process.env.CHAIN_ID;
const hostname = process.env.HOSTNAME;
const redis_url = process.env.UPSTASH_REDIS_REST_URL!;
const redis_token = process.env.UPSTASH_REDIS_REST_TOKEN!;
const connect_url = process.env.CONNECT_URL;
const nestfi_url = process.env.NESTFI_URL!;

const redis = new Redis({
  url: redis_url,
  token: redis_token,
})

i18n.configure({
  locales: ['en', 'es', 'ja', 'ko', 'pt', 'ru', 'tr', 'vi'],
  defaultLocale: 'en',
  directory: "./locales",
  register: global
})

const t = (p: any, l: any, ph?: any) => {
  return i18n.__({phrase: p, locale: l}, ph)
}

bot.start(async (ctx) => {
  const from = ctx.from;
  const chatId = ctx.chat.id;
  let lang = from.language_code;

  if (from.is_bot || chatId < 0) {
    return
  }
  try {
    const klAddress = ctx.startPayload;
    const jwt = await redis.get(`auth:${from.id}`) as string | undefined

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
            .then(data => data?.value?.filter((item: any) => item.walletAddress.toLowerCase() === klAddress.toLowerCase()).length > 0 || false)

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
            ctx.reply(t(`Would you like to copy Trader 👤 {{nickName}}'s positions immediately?`, lang, {
              nickName: nickName
            }), Markup.inlineKeyboard([
              [Markup.button.callback(t(`Nope, I change my mind.`, lang), 'cb_menu')],
              [Markup.button.callback(t(`Yes, copy now!`, lang), `cb_copy_setting_${klAddress}`)],
            ]))
          } else {
            ctx.reply(t(`You have already followed this trader. All positions from this trader will be automatically executed for you.`, lang), Markup.inlineKeyboard([
              [Markup.button.callback(t(`Settings`, lang), `cb_copy_setting_${klAddress}`)],
              [Markup.button.callback(t(`« Back`, lang), 'cb_menu')],
            ]))
          }
        } else {
          ctx.reply(t(`💢 Invalid Trader\n————————————————————\nPeter Mason is not on the NESTFi traders list.\nPlease select other traders on NESTFi.`, lang), {
            ...Markup.inlineKeyboard([
              [Markup.button.url(t(`Access NESTFi Website`, lang), nestfi_url)]
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
          .then(res => res.value)
        ctx.reply(t(`📊 My Trades\n————————————————————\nCopy Trading Total Amount: {{total}} NEST\nProfit: {{profit}} NEST\nUnrealized PnL: {{unrealizedPnl}} NEST\nAddress: \`{{address}}\``, lang, {
          total: (data?.assets || 0).toFixed(2),
          profit: (data?.profit || 0).toFixed(2),
          unrealizedPnl: (data?.unRealizedPnl || 0).toFixed(2),
          address: address,
        }), {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [Markup.button.callback(t(`My Account`, lang), 'cb_account')],
            [Markup.button.callback(t(`My Traders`, lang), 'cb_kls_p_1')],
            [Markup.button.callback(t(`My Copy Trading`, lang), 'cb_ps_all_1')],
          ])
        })
      }
    } else {
      if (klAddress && isAddress(klAddress)) {
        ctx.reply(t(`👩‍💻 Once you've linked your wallet, click "Copy Now" to continue with the copy trading.`, lang), Markup.inlineKeyboard([
          [Markup.button.url(t(`Copy Now`, lang), `https://t.me/NESTFiBot?start=${klAddress}`)],
        ]))
      }
      const nonce = Math.random().toString(36).substring(2, 18);
      const message = await ctx.reply(t(`👛 Link Wallet\n————————————————————\nHi there, before copying trading, please link your wallet on NESTFi.\n\n👇Note: The link is valid for 10 minutes.`, lang), {
        ...Markup.inlineKeyboard([
          [Markup.button.url(t(`PC ➜ Link My Wallet`, lang), `https://${connect_url}/${nonce}`)],
          [Markup.button.url(t(`Mobile ➜ Link My Wallet`, lang), `https://metamask.app.link/dapp/${connect_url}/${nonce}`)],
        ])
      })
      const message_id = message.message_id
      await redis.set(`code:${nonce}`, JSON.stringify({
        message_id: message_id,
        user: from,
      }), {
        ex: 600
      })
    }
  } catch (e) {
    ctx.reply(t(`Something went wrong.`, lang))
    console.log(e)
  }
});

bot.help((ctx) => {
  const from = ctx.from;
  const chat = ctx.chat;
  let lang = from.language_code;
  if (chat.id < 0 || from.is_bot) {
    return
  }
  ctx.reply(t(`🌏 For further information, please access nestfi.org\n\nControl me by sending these commands:\n\n/account - View my account\n/cancel - Cancel link wallet\n/help - Commands`, lang))
});

bot.command('account', async (ctx) => {
  const from = ctx.from;
  const chat = ctx.chat;
  let lang = from.language_code;

  if (chat.id < 0 || from.is_bot) {
    return
  }
  try {
    const jwt = await redis.get(`auth:${from.id}`) as string | undefined | null | null

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
        .then(res => res?.value)
      ctx.reply(t(`📊 My Trades\n————————————————————\nCopy Trading Total Amount: {{total}} NEST\nProfit: {{profit}} NEST\nUnrealized PnL: {{unrealizedPnl}} NEST\nAddress: \`{{address}}\``, lang, {
        total: (data?.assets || 0).toFixed(2),
        profit: (data?.profit || 0).toFixed(2),
        unrealizedPnl: (data?.unRealizedPnl || 0).toFixed(2),
        address: address
      }), {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback(t(`My Account`, lang), 'cb_account')],
          [Markup.button.callback(t(`My Traders`, lang), 'cb_kls_p_1')],
          [Markup.button.callback(t(`My Copy Trading`, lang), 'cb_ps_all_1')],
        ])
      })
    } else {
      ctx.reply(t(`Hi here! Please authorize me to set up a NESTFi integration.\n\nYou can use command: /start`, lang))
    }
  } catch (e) {
    ctx.reply(t(`Something went wrong.`, lang))
    console.log(e)
  }
})

// Stop command use to delete authorization request
bot.command('cancel', async (ctx) => {
  const from = ctx.from;
  const chat = ctx.chat;
  let lang = from.language_code;

  if (chat.id < 0 || from.is_bot) {
    return
  }
  const jwt = await redis.get(`auth:${from.id}`) as string | undefined | null

  if (jwt) {
    const decode = jwt.split('.')[1]
    const decodeJson = JSON.parse(Buffer.from(decode, 'base64').toString())
    const address = decodeJson.walletAddress
    ctx.reply(t(`You are about to cancel your NESTFi authorization in this bot. Is that correct?\n\nAddress: \`{{address}}\``, lang, {
      address: address
    }), {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback(t(`Yes, deauthorize now.`, lang), 'cb_unauthorize')],
        [Markup.button.callback(t(`Nope, I change my mind.`, lang), 'cb_menu')],
      ])
    })
  } else {
    ctx.reply(t(`👩‍💻 You have not authorized any wallet yet.`, lang))
  }
})

// cb_copy_setting_[KL]
bot.action(/cb_copy_setting_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const klAddress = action.split('_')[3];
  const lang = from.language_code;

  try {
    const jwt = await redis.get(`auth:${from.id}`) as string | undefined | null

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
      const positionInfo = await fetch(`${hostname}/nestfi/copy/follower/future/info?chainId=${chainId}&copyKolAddress=${klAddress}`, {
        headers: {
          'Authorization': jwt
        }
      }).then((res) => res.json())
        // @ts-ignore
        .then(data => data?.value)

      const klInfo = await fetch(`${hostname}/nestfi/copy/kol/info?chainId=${chainId}&walletAddress=${klAddress}`, {
        headers: {
          'Authorization': jwt
        }
      }).then(res => res.json())
        // @ts-ignore
        .then(data => data.value)

      const position = positionInfo?.totalCopyAmount || 0
      const nickName = klInfo?.nickName || '-'
      const groupId = klInfo?.groupId || '-'

      if (availableBalance + position < 200) {
        ctx.reply(t(`💔 Insufficient Balance\n————————————————————\nYour account balance is insufficient. Please deposit first to initiate lightning trading on NESTFi.`, lang), {
          ...Markup.inlineKeyboard([
            [Markup.button.url(t(`Deposit`, lang), nestfi_url)],
            [Markup.button.callback(t(`Completed, go on!`, lang), `cb_copy_setting_${klAddress}`)],
          ])
        })
        return
      } else {
        await redis.set(`intent:${from.id}`, JSON.stringify({
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
        }), {
          ex: 600
        });
        let choice = [0, 0, 0];
        choice[0] = Math.floor(availableBalance * 0.5 / 50) * 50;
        choice[1] = Math.floor(availableBalance * 0.75 / 50) * 50;
        choice[2] = Math.floor(availableBalance / 50) * 50;
        ctx.reply(t(`💵 Add Copy Trading Amount\n————————————————————\nMy Account Balance: {{balance}} NEST\nCopy Trading Total Amount: {{total}} NEST\n\nYou are following: {{nickName}}\nPlease add the amount you invest to this trader below.`, lang, {
          balance: (availableBalance || 0).toFixed(2),
          total: (position || 0)?.toFixed(2),
          nickName: nickName,
        }), {
          ...Markup.keyboard([
            choice.filter((i) => i >= 200).map((i: number) => String(i)),
            [t(`« Back`, lang)],
          ]).oneTime().resize()
        })
      }
    } else {
      ctx.reply(t(`Hi here! Please authorize me to set up a NESTFi integration.\n\nYou can use command: /start`, lang))
    }
  } catch (e) {
    ctx.answerCbQuery(t(`Something went wrong.`, lang))
  }
})

bot.action('cb_menu', async (ctx) => {
  const {from} = ctx.update.callback_query;
  let lang = from.language_code;
  try {
    const jwt = await redis.get(`auth:${from.id}`) as string | undefined | null

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
        .then(res => res?.value)

      ctx.editMessageText(t(`📊 My Trades\n————————————————————\nCopy Trading Total Amount: {{total}} NEST\nProfit: {{profit}} NEST\nUnrealized PnL: {{unrealizedPnl}} NEST\nAddress: \`{{address}}\``, lang, {
        total: (data?.assets || 0).toFixed(2),
        profit: (data?.profit || 0).toFixed(2),
        unrealizedPnl: (data?.unRealizedPnl || 0).toFixed(2),
        address: address,
      }), {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback(t(`My Account`, lang), 'cb_account')],
          [Markup.button.callback(t(`My Traders`, lang), 'cb_kls_p_1')],
          [Markup.button.callback(t(`My Copy Trading`, lang), 'cb_ps_all_1')],
        ])
      })
    } else {
      ctx.reply(t(`Hi {{username}}! Please authorize me to set up a NESTFi integration.\n\nYou can use command: /start`, lang, {
        username: from.username
      }))
    }
  } catch (e) {
    ctx.answerCbQuery(t(`Something went wrong.`, lang))
  }
})

bot.action('cb_account', async (ctx) => {
  const {from} = ctx.update.callback_query;
  let lang = from.language_code;
  try {
    const jwt = await redis.get(`auth:${from.id}`) as string | undefined | null

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
        .then(res => res?.value)
      ctx.editMessageText(t(`💳 My Account\n————————————————————\nAccount Balance: {{availableBalance}} NEST\nCopy Trading Total Amount: {{copyBalance}} NEST`, lang, {
        availableBalance: (data?.availableBalance || 0).toFixed(2),
        copyBalance: (data?.copyBalance || 0).toFixed(2),
      }), {
        ...Markup.inlineKeyboard([
          [Markup.button.url(t(`Deposit`, lang), nestfi_url)],
          [Markup.button.url(t(`Withdraw`, lang), nestfi_url)],
          [Markup.button.callback(t(`« Back`, lang), 'cb_menu')],
        ])
      })
    } else {
      ctx.editMessageText(t(`Hi {{username}}! Please authorize me to set up a NESTFi integration.\n\nYou can use command: /start`, lang, {
        username: from.username
      }))
    }
  } catch (e) {
    ctx.answerCbQuery('Something went wrong.')
  }
})

// cb_kls_p_[PAGE]
bot.action(/cb_kls_p_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const page = Number(action.split('_')[3]);
  let lang = from.language_code;
  try {
    const jwt = await redis.get(`auth:${from.id}`) as string | undefined | null

    if (jwt) {
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
        inlineKeyboard.push([Markup.button.callback(`${showArray[i]?.nickName || '-'}`, `cb_kl_${showArray[i]?.walletAddress}`)])
      }
      if (page * 5 < length) {
        inlineKeyboard.push([Markup.button.callback(t(`» Next Page`, lang), `cb_kls_p_${page + 1}`)])
      }
      inlineKeyboard.push([Markup.button.callback(t(`« Back`, lang), 'cb_menu')])
      ctx.editMessageText(t(`💪 My Traders\n————————————————————\nThese are the traders you followed.`, lang), {
        ...Markup.inlineKeyboard(inlineKeyboard)
      })
    } else {
      ctx.editMessageText(t(`Hi {{username}}! Please authorize me to set up a NESTFi integration.\n\nYou can use command: /start`, lang, {
        username: from.username
      }))
    }
  } catch (e) {
    ctx.answerCbQuery(t(`Something went wrong.`, lang))
  }
})

// cb_kl_[KL]
bot.action(/cb_kl_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const klAddress = action.split('_')[2];
  let lang = from.language_code;
  try {
    const jwt = await redis.get(`auth:${from.id}`) as string | undefined | null

    if (jwt) {
      const data = await fetch(`${hostname}/nestfi/copy/kol/info?chainId=${chainId}&walletAddress=${klAddress}`, {
        headers: {
          'Authorization': jwt
        }
      }).then(res => res.json())
        // @ts-ignore
        .then(res => res?.value)
      ctx.editMessageText(t(`👤 {{nickName}}\n————————————————————\nFollowers: {{currentFollowers}}\nAUM: {{followersAssets}} NEST\n7D ROI: {{kolProfitLossRate}}%\n7D Earnings: {{kolProfitLoss}} NEST`, lang, {
        nickName: data?.nickName || '-',
        currentFollowers: data?.currentFollowers || 0,
        followersAssets: (data?.followersAssets || 0).toFixed(2),
        kolProfitLossRate: (data.kolProfitLossRate || 0).toFixed(2),
        kolProfitLoss: (data?.followerProfitLoss || 0).toFixed(2),
      }), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(t(`View Copy Trading`, lang), `cb_ps_${klAddress}_1`)],
          [Markup.button.callback(t(`Stop Copying`, lang), `cb_r_stop_kl_${klAddress}`), Markup.button.callback('Settings', `cb_copy_setting_${klAddress}`)],
          [Markup.button.callback(t(`« Back`, lang), 'cb_kls_p_1')]
        ])
      })
    } else {
      ctx.editMessageText(t(`Hi {{username}}! Please authorize me to set up a NESTFi integration.\n\nYou can use command: /start`, lang, {
        username: from.username
      }))
    }
  } catch (e) {
    ctx.answerCbQuery(t(`Something went wrong.`, lang))
  }
})

// cb_ps_[KL]_[PAGE]
bot.action(/cb_ps_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const klAddress = action.split('_')[2]
  const page = Number(action.split('_')[3])
  let lang = from.language_code;
  try {
    const jwt = await redis.get(`auth:${from.id}`) as string | undefined | null

    if (jwt) {
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
      const showData = data?.value?.sort((a, b) => b?.timestamp - a?.timestamp).slice((page - 1) * 5, page * 5)
      let inlineKeyboard: any [] = []
      const buttons = showData.map((item: any, index: number) => (
        Markup.button.callback(`${index + 1 + (page - 1) * 5}`, `cb_oi_${item.id}_${klAddress}`)
      ))
      if (buttons.length > 0) {
        inlineKeyboard.push(buttons)
      }
      if (page * 5 < length) {
        inlineKeyboard.push([Markup.button.callback(t(`» Next Page`, lang), `cb_ps_${klAddress}_${page + 1}`)])
      }
      inlineKeyboard.push([Markup.button.callback(t(`History`, lang), `cb_klh_${klAddress}_1`), Markup.button.callback('« Back', klAddress === 'all' ? 'cb_menu' : `cb_kl_${klAddress}`)])
      ctx.editMessageText(`🎯 ${(t(`Current Copy Trading Position`, lang))}
${showData.length > 0 ? `${showData.map((item: any, index: number) => (`
=============================
${index + 1 + (page - 1) * 5}. ${item?.product || '-'} ${item?.direction ? 'Long' : 'Short'} ${item?.leverage || '-'}x
   ${(t(`Actual Margin`, lang))}: ${(item?.margin || 0).toFixed(2)} NEST ${item?.profitLossRate > 0 ? `+${item?.profitLossRate?.toFixed(2)}` : item?.profitLossRate?.toFixed(2)}%
   ${(t(`Open Price`, lang))}: ${(item?.orderPrice || 0).toFixed(2)} USDT
   ${(t(`Open: UTC`, lang))} ${new Date(item?.timestamp * 1000 || 0).toISOString().replace('T', ' ').substring(5, 19)}`)).join('')}

👇 ${(t(`Click the number to manage the corresponding order.`, lang))}` : `\n${(t(`No copy trading position yet!`, lang))}`}`, {
        ...Markup.inlineKeyboard(inlineKeyboard)
      })
    } else {
      ctx.editMessageText(t(`Hi {{username}}! Please authorize me to set up a NESTFi integration.\n\nYou can use command: /start`, lang, {
        username: from.username
      }))
    }
  } catch (e) {
    ctx.answerCbQuery(t(`Something went wrong.`, lang))
  }
})

// cb_klh_[KL]_[PAGE]
bot.action(/cb_klh_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const klAddress = action.split('_')[2];
  const page = Number(action.split('_')[3]);
  let lang = from.language_code;
  try {
    const jwt = await redis.get(`auth:${from.id}`) as string | undefined | null

    if (jwt) {
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
      const showData = data?.value?.sort((a, b) => b.closeTime - a.closeTime)?.slice((page - 1) * 5, page * 5)
      let inlineKeyboard: any [] = []
      if (page * 5 < length) {
        inlineKeyboard.push([Markup.button.callback(t(`» Next Page`, lang), `cb_klh_${klAddress}_${page + 1}`)])
      }
      inlineKeyboard.push([Markup.button.callback(t(`« Back`, lang), `cb_ps_${klAddress}_1`)])
      ctx.editMessageText(`🧩 ${t(`History`, lang)}
${showData?.length > 0 ? `${showData?.map((item: any, index: number) => (`
=============================
${index + 1 + (page - 1) * 5}. ${item?.product || '-'} ${item?.direction ? 'Long' : 'Short'} ${item?.leverage || '-'}x
   ${t(`Actual Margin`, lang)}: ${(item?.margin || 0).toFixed(2)} NEST ${item?.profitLossRate > 0 ? `+${item?.profitLossRate?.toFixed(2)}` : item?.profitLossRate?.toFixed(2)}%
   ${t(`Open Price`, lang)}: ${(item?.openPrice || 0).toFixed(2)} USDT
   ${t(`Close price`, lang)}: ${(item?.closePrice || 0).toFixed(2)} USDT
   ${t(`Liq Price`, lang)}: ${item?.lipPrice ? item?.lipPrice?.toFixed(2) : '-'} USDT
   ${t(`Open: UTC`, lang)} ${new Date(item?.openTime * 1000 || 0).toISOString().replace('T', ' ').substring(5, 19)}
   ${t(`Close: UTC`, lang)} ${new Date(item?.closeTime * 1000 || 0).toISOString().replace('T', ' ').substring(5, 19)}`)).join('')}` : `\n${t(`No copy trading position yet!`, lang)}`}`, {
        ...Markup.inlineKeyboard(inlineKeyboard)
      })
    } else {
      ctx.editMessageText(t(`Hi {{username}}! Please authorize me to set up a NESTFi integration.\n\nYou can use command: /start`, lang, {
        username: from.username
      }))
    }
  } catch (e) {
    ctx.answerCbQuery(t(`Something went wrong.`, lang))
  }
})

// cb_r_stop_kl_[KL]
bot.action(/cb_r_stop_kl_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const klAddress = action.split('_')[4];
  let lang = from.language_code;
  try {
    const jwt = await redis.get(`auth:${from.id}`) as string | undefined | null

    if (jwt) {
      const request = await fetch(`${hostname}/nestfi/copy/follower/future/info?chainId=${chainId}&copyKolAddress=${klAddress}`, {
        headers: {
          'Authorization': jwt
        }
      }).then((res) => res.json())
        // @ts-ignore
        .then(data => data?.value)

      ctx.editMessageText(t(`🙅 Stop Copying\n————————————————————\nTotal Copy Amount: {{total}} NEST\nOpen Interest: {{openInterest}} NEST\nTotal Profit: {{totalProfit}} NEST\n\n_End copy will liquidate your position with market orders, and automatically return the assets to your Account after deducting the profits sharing._\n❓Are you sure to stop copying?`, lang, {
          total: (request?.totalCopyAmount || 0).toFixed(2),
          openInterest: (request?.openInterest || 0).toFixed(2),
          totalProfit: (request?.totalProfit || 0).toFixed(2),
        }
      ), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(t(`Nope, I change my mind.`, lang), `cb_kl_${klAddress}`)],
          [Markup.button.callback(t(`Yes, stop copying trading.`, lang), `cb_stop_kl_${klAddress}`)],
        ])
      })
    } else {
      ctx.editMessageText(t(`Hi {{username}}! Please authorize me to set up a NESTFi integration.\n\nYou can use command: /start`, lang, {
        username: from.username
      }))
    }
  } catch (e) {
    ctx.answerCbQuery(t(`Something went wrong.`, lang))
  }
})

// cb_stop_kl_[KL]
bot.action(/cb_stop_kl_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const klAddress = action.split('_')[3];
  let lang = from.language_code;
  try {
    const jwt = await redis.get(`auth:${from.id}`) as string | undefined | null

    if (jwt) {
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
        ctx.editMessageText(t(`🥳 Stop Copying Successfully!`, lang), {
          ...Markup.inlineKeyboard([
            [Markup.button.callback(t(`« Back`, lang), 'cb_kls_p_1')],
          ])
        })
      } else {
        ctx.answerCbQuery(t(`Something went wrong.`, lang))
      }
    } else {
      ctx.editMessageText(t(`Hi {{username}}! Please authorize me to set up a NESTFi integration.\n\nYou can use command: /start`, lang, {
        username: from.username
      }))
    }
  } catch (e) {
    ctx.answerCbQuery(t(`Something went wrong.`, lang))
  }
})

// cb_po_[ORDER_INDEX]_[KL]
bot.action(/cb_oi_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const oi = action.split('_')[2];
  const klAddress = action.split('_')[3];
  let lang = from.language_code;
  try {
    const jwt = await redis.get(`auth:${from.id}`) as string | undefined | null

    if (jwt) {
      const data = await fetch(`${hostname}/nestfi/op/future/getById/${oi}`, {
        headers: {
          'Authorization': jwt,
        }
      }).then(res => res.json())
        // @ts-ignore
        .then(res => res?.value)

      ctx.editMessageText(t(`🍯 Position {{oi}}\n————————————————————\n{{product}} {{direction}} {{leverage}}x\nActual Margin: {{margin}} NEST {{profitLossRate}}%\nOpen Price: {{orderPrice}} USDT\nMarket Price: {{marketPrice}} USDT\nLiq Price: {{lipPrice}} USDT\nOpen: UTC {{open}}`, lang, {
        oi: oi,
        product: data?.product || '-',
        direction: data?.direction ? 'Long' : 'Short',
        leverage: data?.leverage || '-',
        margin: (data?.margin || 0).toFixed(2),
        profitLossRate: data?.profitLossRate > 0 ? `+${data?.profitLossRate.toFixed(2)}` : data?.profitLossRate.toFixed(2),
        orderPrice: (data?.orderPrice || 0).toFixed(2),
        marketPrice: (data?.marketPrice || 0).toFixed(2),
        lipPrice: data?.lipPrice ? data?.lipPrice?.toFixed(2) : '-',
        open: new Date(data?.timestamp * 1000 || 0).toISOString().replace('T', ' ').substring(5, 19)
      }), {
        ...Markup.inlineKeyboard([
          [Markup.button.callback(t(`Close the Position`, lang), `cb_close_oi_${oi}_${klAddress}`)],
          [Markup.button.callback(t(`« Back`, lang), `cb_ps_${klAddress}_1`)],
        ])
      })
    } else {
      ctx.editMessageText(t(`Hi {{username}}! Please authorize me to set up a NESTFi integration.\n\nYou can use command: /start`, lang, {
        username: from.username
      }))
    }
  } catch (e) {
    ctx.answerCbQuery(t(`Something went wrong.`, lang))
  }
})

// cb_close_oi_[ORDER_INDEX]_[KL]
bot.action(/cb_close_oi_.*/, async (ctx) => {
  // @ts-ignore
  const {from, data: action} = ctx.update.callback_query;
  const oi = action.split('_')[3];
  const klAddress = action.split('_')[4];
  let lang = from.language_code;
  try {
    const jwt = await redis.get(`auth:${from.id}`) as string | undefined | null

    if (jwt) {
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
        ctx.editMessageText(t(`🥳 Close Position Successfully!`, lang), {
          ...Markup.inlineKeyboard([
            [Markup.button.callback(t(`« Back`, lang), `cb_ps_${klAddress}_1`)]
          ])
        })
      } else {
        ctx.answerCbQuery(t(`Something went wrong.`, lang))
      }
    } else {
      ctx.editMessageText(t(`Hi {{username}}! Please authorize me to set up a NESTFi integration.\n\nYou can use command: /start`, lang, {
        username: from.username
      }))
    }
  } catch (e) {
    ctx.answerCbQuery(t(`Something went wrong.`, lang))
  }
})

// Handle logout button click
bot.action('cb_unauthorize', async (ctx) => {
  const {from} = ctx.update.callback_query;
  let lang = from.language_code;
  try {
    await redis.del(`auth:${from.id}`)
    ctx.editMessageText(t(`👩‍💻 You have successfully deauthorized the NESTFi Copy Trading bot on NESTFi.`, lang), Markup.inlineKeyboard([]))
  } catch (e) {
    ctx.answerCbQuery(t(`Something went wrong.`, lang))
  }
})

bot.action('confirm_copy_setting', async (ctx) => {
  const {from} = ctx.update.callback_query;
  let lang = from.language_code;
  try {
    const intent = await redis.get(`intent:${from.id}`) as any

    if (intent) {
      if (intent?.category === 'cb_copy_setting') {
        const jwt = await redis.get(`auth:${from.id}`) as string | undefined | null

        if (jwt) {
          const {kl, total, single, nickName, groupId} = intent.value
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
            const targetChat = await bot.telegram.getChat(groupId)
            ctx.editMessageText(t(`🥳 Successfully Copy Trading\n————————————————————\nMore latest orders from {{nickName}} will be posted in the group.\n\nTelegram Group: {{groupId}}`, lang, {
              nickName: nickName,
              // @ts-ignore
              groupId: targetChat?.username ? `@${targetChat?.username}` : groupId
            }), {
              ...Markup.inlineKeyboard([
                [Markup.button.callback(t('« Back', lang), 'cb_menu')],
              ])
            })
          } else {
            ctx.answerCbQuery(t(`Something went wrong.`, lang))
          }
        } else {
          ctx.editMessageText(t(`Hi {{username}}! Please authorize me to set up a NESTFi integration.\n\nYou can use command: /start`, lang, {
            username: from.username
          }))
        }
      } else {
        ctx.editMessageText(t(`Sorry, we have not found your copy trading request`, lang), {
          ...Markup.inlineKeyboard([]),
        })
      }
    }
  } catch (e) {
    ctx.answerCbQuery(t(`Something went wrong.`, lang))
  }
})

bot.action('cancel_copy_setting', async (ctx) => {
  const {from} = ctx.update.callback_query;
  let lang = from.language_code;
  try {
    await redis.del(`intent:${from.id}`)
    ctx.editMessageText(t(`🙅‍️ Alright, your copy trading request has been cancelled successfully!`, lang), {
      ...Markup.inlineKeyboard([
        [Markup.button.callback(t(`« Back`, lang), 'cb_menu')],
      ]),
    })
  } catch (e) {
    ctx.answerCbQuery(t(`Something went wrong.`, lang))
  }
})

bot.on("message", async (ctx) => {
  const {from, chat} = ctx.update.message;
  let lang = from.language_code;
  if (chat.id < 0 || from.is_bot) {
    return
  }
  // @ts-ignore
  const input = ctx.message.text;
  const intent = await redis.get(`intent:${from.id}`) as any
  if (intent) {
    if (intent.category === 'cb_copy_setting') {
      if (input === '« Back') {
        await redis.del(`intent:${from.id}`)
        ctx.reply(t(`🙅‍ Alright, your copy trading request has been cancelled successfully!`, lang))
        return
      }
      let {total, single, availableBalance, position, nickName} = intent.value
      if (total === 0) {
        const add = Number(input)
        if (add < 200 || add > availableBalance) {
          ctx.reply(t(`💢 Invalid Amount\nPlease enter a valid amount between 200 and {{availableBalance}}`, lang, {
            availableBalance: availableBalance
          }))
          return
        }
        // update intent
        await redis.set(`intent:${from.id}`, JSON.stringify({
          category: 'cb_copy_setting',
          value: {
            ...intent.value,
            total: add + position,
          }
        }), {
          ex: 600
        })
        let choice = [0, 0, 0]
        choice[0] = Math.floor((add + position) * 0.1 / 50) * 50
        choice[1] = Math.floor((add + position) * 0.2 / 50) * 50
        choice[2] = Math.floor((add + position) * 0.4 / 50) * 50
        ctx.reply(t(`💵 Copy Trading Each Order\n————————————————————\nYou are following: {{nickName}}\nPlease type the amount you invest to this trader for each order below.`, lang, {
          nickName: nickName
        }), {
          ...Markup.keyboard([
            choice.filter((i) => i >= 50).map(i => String(i)),
            ['« Back'],
          ]).oneTime().resize()
        })
      } else if (single === 0) {
        if (Number(input) < 50 || Number(input) > total) {
          let choice = [0, 0, 0]
          choice[0] = Math.floor(total * 0.1 / 50) * 50
          choice[1] = Math.floor(total * 0.2 / 50) * 50
          choice[2] = Math.floor(total * 0.4 / 50) * 50
          ctx.reply(t(`💢 Invalid Amount\nPlease enter a valid amount between 50 and your CopyTrading Total Amount, {{total}}`, lang, {
            total: total
          }), {
            ...Markup.keyboard([
              choice.filter((i) => i >= 50).map(i => String(i)),
              ['« Back'],
            ])
          })
        } else {
          await redis.set(`intent:${from.id}`, JSON.stringify({
            category: 'cb_copy_setting',
            value: {
              ...intent.value,
              single: Number(input),
            }
          }), {
            ex: 600
          })
          ctx.reply(t(`👩‍💻 Confirm\n————————————————————\nCopy Trading Total Amount: {{total}} NEST \nCopy Trading Each Order: {{input}} NEST \n\nYou are following: {{nickName}}\nAre you sure?`, lang, {
            total: total,
            input: input,
            nickName: nickName,
          }), {
            ...Markup.inlineKeyboard([
              [Markup.button.callback(t(`Yes, I’m sure.`, lang), 'confirm_copy_setting')],
              [Markup.button.callback(t(`Nope, I change my mind.`, lang), 'cancel_copy_setting')]
            ])
          })
        }
      }
    }
  }
})

export const handler = http(bot.webhookCallback("/bot"));