import { Bot } from 'grammy';
import dotenv from 'dotenv';
dotenv.config();
import { address_handler, start_handler } from './handler.js';
import { getContext, listPositionsByOwner, getPositionDetails} from './utils/orca.js';
import { format } from './utils/range.js';

import { sleep } from './utils/async.js';

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
        console.log('>>>> event loop');
        busy = true;
        const orca = await getContext();
        for (const user in session) {
            const processed = [];
            for (const candidate of session[user]) {
                const lp = await getPositionDetails(orca, candidate);            
                console.log(lp);
                if (lp.pool_price > lp.upper_price || lp.pool_price < lp.lower_price) {
                    console.log(">>>> out range");
                    const range_text = format(lp.pool_price, lp.lower_price, lp.upper_price);
                    let msg = "🙋🏻‍♂️  Your LP is out of range:\n\n" +
                        `🚫  *${lp.token_a} \\- ${lp.token_b}*  ${range_text}`;
                    bot.api.sendMessage(user, msg, { parse_mode: "MarkdownV2" });
                    processed.push(candidate);
                }
                session[user] = session[user].filter((address) => !processed.includes(address));
                await sleep(400);
            }
        }
        busy = false;
    } else {
        console.log('>>>> busy')
    }
}, 20000);