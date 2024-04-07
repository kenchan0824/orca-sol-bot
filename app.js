import { Bot } from 'grammy';
import dotenv from 'dotenv';
dotenv.config();
import { address_handler, start_handler } from './handler.js';

const bot = new Bot(process.env.TG_API_KEY);

bot.command('start', start_handler);

bot.on('message', address_handler);

bot.start();
console.log('bot is running ...');
