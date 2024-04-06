import { Bot } from 'grammy';
import dotenv from 'dotenv';
dotenv.config();
import { getContext, listPositionsByOwner, getPositionDetails} from './utils/orca.js';
import { format } from './utils/range.js';

const bot = new Bot(process.env.TG_API_KEY);

bot.command('start', (ctx) => {
    const msg = "*Orca Alert Bot*\n" +
    "We notify you when your Orca's 🐳 LPs are out of range\\.\n" +
    "No false alarm\\. 🚨 No NFT 🗿 required\\.\n\n" +
    "*Usage*\n" +
    "Paste your Solana wallet 💰 address to start with\\. We list all of your LP positions\\.\n\n" +
    "The number beside ⚽️ indicates the buffer to the nearest boundary 🗑, when the position is in range ✅\\. " +
    "Otherwise 🚫, it shows how the current price ⚽️ derivates from the boundary 🗑\\."

    ctx.reply(msg, { parse_mode: "MarkdownV2" });
});

bot.on('message', async (ctx) => {
    if (!ctx.message.text) return;
    const wallet_address = ctx.message.text.trim();
    console.log('>>>> Timestamp', new Date().toLocaleString());
    console.log('>>>> Wallet Address', wallet_address);

    try {
        const orca = await getContext();
        const position_keys = await listPositionsByOwner(orca, wallet_address);
        const lines = [];
        if (position_keys.length) {
            await ctx.reply("🤔  Let me check your LPs ...");
            for (const key of position_keys) {
                const lp = await getPositionDetails(orca, key);
                const out_range = lp.pool_price > lp.upper_price || lp.pool_price < lp.lower_price;
                const range_text = format(lp.pool_price, lp.lower_price, lp.upper_price);
                lines.push(`${out_range ? '🚫' : '✅'}  *${lp.token_a} \\- ${lp.token_b}*  ${range_text}`)
            }
            await ctx.reply(lines.join('\n\n'), { parse_mode: "MarkdownV2" });
        } else {
            await ctx.reply("🤷🏻‍♂️  It seems you don't have any LPs.");
        }
    } catch (err) {
        await ctx.reply("🙅🏻‍♂️  Sorry I can't recognise your wallet address.");
        console.log(err);
    }
})

bot.start();
console.log('bot is running ...');
