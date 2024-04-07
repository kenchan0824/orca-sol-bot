import { Bot } from 'grammy';
import dotenv from 'dotenv';
dotenv.config();
import { address_handler, notify_handler, start_handler } from './handler.js';


const session = {};
let busy = false;

const bot = new Bot(process.env.TG_API_KEY);

bot.command('start', start_handler);

bot.command('stop', (ctx) => { 
    delete session[ctx.message.from.id];
});

bot.on('message', async (ctx) => address_handler(ctx, session));

bot.start();
console.log('bot is running ...');

setInterval(async () => {
    if (!busy) {
        busy = true;
        await notify_handler(bot, session);
        busy = false;
    } else {
        console.log('>>>> Timestamp', new Date().toLocaleString());
        console.log('>>>> busy')
    }
}, 5_000);