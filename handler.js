import { getContext, listPositionsByOwner, getPositionDetails} from './utils/orca.js';
import { format } from './utils/range.js';


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
    const valid_lps = [];

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
                if (!out_range) valid_lps.push(key);
            }
            ctx.reply(lines.join('\n\n'), { parse_mode: "MarkdownV2" });            
        } else {
            ctx.reply("🤷🏻‍♂️  It seems you don't have any LPs.");
        }
    } catch (err) {
        await ctx.reply("🙅🏻‍♂️  Sorry I can't recognise your wallet address.");
        console.log(err);
    } finally {
        if (valid_lps.length) {
            session[ctx.message.from.id] = valid_lps;
        } else {
            delete session[ctx.message.from.id];
        }
    }
} 