// @ts-ignore
import http from "serverless-http";
import {Telegraf} from "telegraf";
import {Configuration, OpenAIApi, ChatCompletionRequestMessage} from "openai";

const token = process.env.BOT_TOKEN!;
const bot = new Telegraf(token);

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const binance_host = "https://api.binance.com"
// /api/v3/ticker/price

const getTokenPrice = async (token: string) => {
  const price = await fetch(`${binance_host}/api/v3/ticker/price?symbol=${token}USDT`);
  const json = await price.json();
  return json.price;
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
      functions: [
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
      ],
      function_call: "auto",
      max_tokens: 250,
    });
    const response_message = chatCompletion.data.choices[0].message
    // check if the response is a function call
    if (response_message?.function_call) {
      const available_functions = {
        "get_token_price": getTokenPrice
      }
      const function_name = response_message.function_call.name;
      if (!function_name) throw new Error(`Function ${function_name} not found`);
      // @ts-ignore
      const function_to_call = available_functions[function_name];
      if (!function_to_call) throw new Error(`Function ${function_name} not found`);
      const function_args = response_message.function_call.arguments;
      if (!function_args) throw new Error(`Function ${function_name} arguments not found`);
      // @ts-ignore
      const function_response = await function_to_call(function_args?.token);
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
    }
    // @ts-ignore
    ctx.reply(chatCompletion.data.choices[0].message.content);
  } catch (e) {
    ctx.reply("Sorry, I don't understand that.");
  }
})

export const handler = http(bot.webhookCallback("/bot"));
