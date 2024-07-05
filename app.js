import { Bot } from 'grammy';
import dotenv from 'dotenv';
dotenv.config();
import { addressHandler, notifyHandler, startHandler } from './handler.js';


const session = {};
let busy = false;
const bot = new Bot(process.env.TG_API_KEY);

bot.command('start', startHandler);

bot.command('stop', (ctx) => { 
    delete session[ctx.message.from.id];
    ctx.reply("🔕  Notification Off");
});

bot.on('message', async (ctx) => addressHandler(ctx, session));

bot.start();
console.log('bot is running ...');

setInterval(async () => {
    if (!busy) {
        busy = true;
        await notifyHandler(bot, session);
        busy = false;
    } else {
        console.log('>>>> Timestamp', new Date().toLocaleString());
        console.log('>>>> busy')
    }
}, 60_000);

bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
        console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
        console.error("Could not contact Telegram:", e);
    } else {
        console.error("Unknown error:", e);
    }
});