// @ts-ignore
import http from "serverless-http";
import { Telegraf } from "telegraf";

const token = process.env.BOT_TOKEN!;
const bot = new Telegraf(token);

bot.on("text", ctx => ctx.reply(ctx.message.text));

export const nest_bot = http(bot.webhookCallback("/bot"));
