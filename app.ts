import http from "serverless-http";
import {Markup, Telegraf} from "telegraf";
import { Redis } from '@upstash/redis';
import fetch from "node-fetch";

const token = process.env.BOT_TOKEN!;
const bot = new Telegraf(token);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

bot.on("text", async (ctx) => {
  ctx.reply('Hello, World!')
})

export const handler = http(bot.webhookCallback("/bot"));
