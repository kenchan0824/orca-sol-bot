import { Bot } from 'grammy';
import dotenv from 'dotenv';
dotenv.config();
import { getContext, listPositionsByOwner, getPositionDetails} from './utils/orca.js';
import { format } from './utils/range.js';

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
        for (const key of position_keys) {
            const lp = await getPositionDetails(orca, key);
            const out_range = lp.pool_price > lp.upper_price || lp.pool_price < lp.lower_price;
            const range_text = format(lp.pool_price, lp.lower_price, lp.upper_price);
            ctx.reply(
                `${out_range ? '🚫' : '✅'} *${lp.token_a} \\- ${lp.token_b}*  ${range_text}`
                , { parse_mode: "MarkdownV2" }
            );
        }
    } catch (err) {
        ctx.reply("Sorry, I can't recognise this address.");
        console.log(err);
    }
})

bot.start();
console.log('bot is running ...');
