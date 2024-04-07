import { getContext, listPositionsByOwner, getPositionDetails} from './utils/orca.js';
import { format } from './utils/range.js';
import { sleep } from './utils/async.js';


export function start_handler(ctx) {

    const msg = "*Orca Alert Bot*\n" +
    "We notify when your Orca's 🐳 LPs are out of range\\.\n" +
    "No false alarm\\. 🚨 No NFT 🗿 required\\.\n\n" +
    "*Usage*\n" +
    "Paste your Solana wallet 💰 address to start with\\. We list all of your LP positions\\.\n\n" +
    "The number beside ⚽️ indicates the buffer to the nearest boundary 🗑, when the position is in range ✅\\. " +
    "Otherwise 🚫, it shows how the current price ⚽️ derivates from the boundary 🗑\\."

    ctx.reply(msg, { parse_mode: "MarkdownV2" });
}

export async function address_handler(ctx, session) {
    if (!ctx.message.text) return;

    const wallet_address = ctx.message.text.trim();
    console.log('>>>> Timestamp', new Date().toLocaleString());
    console.log('>>>> Wallet Address', wallet_address);
    const candidates = [];

    try {
        const orca = await getContext();
        const position_keys = await listPositionsByOwner(orca, wallet_address);

        if (position_keys.length) {
            ctx.reply("🤔  Let me check your LPs ...");

            const lines = [];
            for (const key of position_keys) {
                const lp = await getPositionDetails(orca, key);
                const out_range = lp.pool_price > lp.upper_price || lp.pool_price < lp.lower_price;
                const range_text = format(lp.pool_price, lp.lower_price, lp.upper_price);
                lines.push(`${out_range ? '🚫' : '✅'}  *${lp.token_a} \\- ${lp.token_b}*  ${range_text}`)
                // if (!out_range) 
                candidates.push(key);
            }
            ctx.reply(lines.join('\n\n'), { parse_mode: "MarkdownV2" });            
        } else {
            ctx.reply("🤷🏻‍♂️  It seems you don't have any LPs.");
        }
    } catch (err) {
        await ctx.reply("🙅🏻‍♂️  Sorry I can't recognise your wallet address.");
        console.log(err);
    } finally {
        if (candidates.length) {
            session[ctx.message.from.id] = candidates;
        } else {
            delete session[ctx.message.from.id];
        }
    }
} 

export async function notify_handler(bot, session) {
    const orca = await getContext();
    for (const user in session) {
        const processed = [];
        for (const candidate of session[user]) {
            const lp = await getPositionDetails(orca, candidate);            
            if (lp.pool_price > lp.upper_price || lp.pool_price < lp.lower_price) {
                console.log('>>>> Timestamp', new Date().toLocaleString());
                console.log(">>>> out range");
                console.log(lp);
                const range_text = format(lp.pool_price, lp.lower_price, lp.upper_price);
                let msg = "🔔  Your LP is out of range:\n\n" +
                    `🚫  *${lp.token_a} \\- ${lp.token_b}*  ${range_text}`;
                bot.api.sendMessage(user, msg, { parse_mode: "MarkdownV2" });
                processed.push(candidate);
            }
            session[user] = session[user].filter((address) => !processed.includes(address));
            await sleep(400);
        }
    }
}
