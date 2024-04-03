import { Bot } from 'grammy';
import dotenv from 'dotenv';
dotenv.config();
import { getContext, listPositionsByOwner, getPositionDetails} from './utils/orca.js'


const bot = new Bot(process.env.TG_API_KEY);

bot.command('start', (ctx) => {
    ctx.reply('Welcome to the Orca Solana Bot.');
});

bot.on('message', async (ctx) => {
    if (!ctx.message.text) return;
    const wallet_address = ctx.message.text.trim();
    try {
        const orca = await getContext();
        const position_keys = await listPositionsByOwner(orca, wallet_address);
        for (const [idx, key] of position_keys.entries()) {
            const position = await getPositionDetails(orca, key);
            ctx.reply(`${idx+1}. ${position.token_a} - ${position.token_b}`);
        }
    } catch (err) {
        ctx.reply("Sorry, I can't recognise this address.");
        console.log(err);
    }
})

bot.start();
console.log('bot is running ...');
