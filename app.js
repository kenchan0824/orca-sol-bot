import { Bot } from 'grammy';
import dotenv from 'dotenv';
dotenv.config();

const bot = new Bot(process.env.TG_API_KEY);

bot.command('start', (ctx) => {
    ctx.reply('Welcome to the Orca Solana Bot.');
});

bot.start();
console.log('bot is running ...');