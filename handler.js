import { getNftMintsByOwner } from './utils/tokens.js';
import { getContext, getPositionsByKeys, getPositionsFromMints } from './utils/orca.js';
import { format } from './utils/range.js';


export function startHandler(ctx) {

    const msg = "*Orca Alert Bot*\n" +
        "We notify when your Orca 🐳 LPs are out of range\\.\n" +
        "No false alarm\\. 🚨 No NFT 🗿 required\\.\n\n" +
        "*How To Use*\n" +
        "Paste your Solana wallet 💰 address to start with\\. We'll list all your Orca 🐳 LP positions\\.\n\n" +
        "The number beside ⚽️ indicates the buffer to the nearest boundary 🗑, when the position is in range ✅\\. " +
        "Otherwise 🚫, it shows how the current price ⚽️ derivates from the boundary 🗑\\.\n\n" +
        "Keep calm and stay farming\\. We'll notify 🔔 you when the time comes, but only for the last address inputted\\."

    ctx.reply(msg, { parse_mode: "MarkdownV2" });
}

export async function addressHandler(ctx, session) {
    if (!ctx.message.text) return;

    const walletAdddress = ctx.message.text.trim();
    console.log('>>>> Timestamp', new Date().toLocaleString());
    console.log('>>>> Wallet Address', walletAdddress);
    const notifications = [];

    try {
        const orca = await getContext();
        await ctx.reply("🤔  Let me check your LPs ...");
        const mintAddresses = await getNftMintsByOwner(orca.connection, walletAdddress);
        const positions = await getPositionsFromMints(orca, mintAddresses);

        if (positions.length) {
            const lines = positions.map(lp => {
                const isOutRange = lp.poolPrice > lp.upperPrice || lp.poolPrice < lp.lowerPrice;
                const rangeText = format(lp.poolPrice, lp.lowerPrice, lp.upperPrice);
                
                if (!isOutRange) notifications.push(lp.key);
                return `${isOutRange ? '🚫' : '✅'}  *${lp.tokenA} \\- ${lp.tokenB}*  ${rangeText}`
            })
            await ctx.reply(lines.join('\n\n'), { parse_mode: "MarkdownV2" });

            if (notifications.length) {
                await ctx.reply("🔔  Notification On");
            }
        } else {
            await ctx.reply("🤷🏻‍♂️  It seems you don't have any LPs.");
            await ctx.reply("🔕  Notification Off");
            return;
        }
    } catch (err) {
        await ctx.reply("🙅🏻‍♂️  Sorry, I can't recognise your wallet address.");
        await ctx.reply("🔕  Notification Off");
        console.log('addressHandler', err);

    } finally {
        if (notifications.length) {
            session[ctx.message.from.id] = notifications;
        } else {
            delete session[ctx.message.from.id];
        }
    }
}

export async function notifyHandler(bot, session) {
    console.log('checking notifications ...')
    let orca = null;
    try {
        orca = await getContext();
    } catch (err) {
        console.log('notifyHandler', err.message);
        return;
    }

    for (const user in session) {
        const processed = [];
        const keys = session[user]
        try {
            const positions = await getPositionsByKeys(orca, keys);
            for (const lp of positions) {

                if (lp.poolPrice > lp.upperPrice || lp.poolPrice < lp.lowerPrice) {
                    console.log('>>>> Timestamp', new Date().toLocaleString());
                    console.log(">>>> out range");
                    console.log(lp);
                    const rangeText = format(lp.poolPrice, lp.lowerPrice, lp.upperPrice);
                    let msg = "🔔  Your LP is out of range:\n\n" +
                        `🚫  *${lp.tokenB} \\- ${lp.tokenB}*  ${rangeText}`;
                    await bot.api.sendMessage(user, msg, { parse_mode: "MarkdownV2" });
                    processed.push(lp.key);
                }
            }
        } catch (err) {
            console.log('notifyHandler', err.message);
        }
        session[user] = session[user].filter((address) => !processed.includes(address));
    }
}
