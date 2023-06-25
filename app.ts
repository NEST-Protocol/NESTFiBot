// @ts-ignore
import http from "serverless-http";
import {Markup, Telegraf} from "telegraf";
import {Configuration, OpenAIApi, ChatCompletionRequestMessage} from "openai";
import fetch from "node-fetch";

const token = process.env.BOT_TOKEN!;
const bot = new Telegraf(token);

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const getTokenPrice = async ({token}: { token: string }) => {
  const price = await fetch(`https://api.huobi.pro/market/detail/merged?symbol=${token.toLowerCase()}usdt`);
  const json = await price.json();
  // @ts-ignore
  return `${json?.tick?.close}`;
}

const functions = [
  {
    name: "get_token_price",
    description: "Get latest token price from binance",
    parameters: {
      type: "object",
      properties: {
        token: {
          type: "string",
          description: "token symbol, e.g. NEST, BTC, ETH, DOGE, XRP, MATIC, ADA, BNB, etc.",
        }
      },
      required: ["token"],
    }
  }
]

const functionMap = {
  "get_token_price": getTokenPrice
}

bot.on("text", async (ctx) => {
  try {
    let messages: ChatCompletionRequestMessage[] = [
      {
        role: "system",
        content: "You are NEST Protocol Community Manager. You are talking to a user who is asking for help with a problem."
      },
      {role: "user", content: ctx.message.text}
    ]
    const chatCompletion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-0613",
      messages: messages,
      functions: functions,
      function_call: "auto",
      max_tokens: 250,
    });
    const response_message = chatCompletion.data.choices[0].message
    // check if the response is a function call
    if (response_message?.function_call) {
      const function_name = response_message.function_call.name;
      // @ts-ignore
      const func = functionMap[function_name];
      if (func) {
        // @ts-ignore
        const function_args = JSON.parse(response_message.function_call.arguments);
        const function_response = await func(function_args);
        // append the function response to the messages
        messages.push({
          role: "function",
          name: function_name,
          content: function_response
        })
        const second_response = await openai.createChatCompletion({
          model: "gpt-3.5-turbo-0613",
          messages: messages,
          max_tokens: 250,
        });
        // @ts-ignore
        ctx.reply(second_response.data.choices[0].message.content);
        return
      } else {
        ctx.reply("Function not found");
        return
      }
    }
    // @ts-ignore
    ctx.reply(chatCompletion.data.choices[0].message.content);
  } catch (e) {
    ctx.reply(String(e));
  }
})

export const handler = http(bot.webhookCallback("/bot"));
