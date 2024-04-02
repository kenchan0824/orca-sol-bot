import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import {
    WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, PDAUtil, IGNORE_CACHE
} from "@orca-so/whirlpools-sdk";
import { TOKEN_PROGRAM_ID, unpackAccount } from "@solana/spl-token";
import BN from "bn.js";
import axios from 'axios';


export function getContext() {
    const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    const ctx = WhirlpoolContext.from(connection, {}, ORCA_WHIRLPOOL_PROGRAM_ID);
    return ctx;
}

export async function listPositionsByOwner(ctx, wallet_address) {
    const { value: tokenAccounts } = await ctx.connection.getTokenAccountsByOwner(
        new PublicKey(wallet_address), { programId: TOKEN_PROGRAM_ID }
    );

    const pda_pubkeys = [];
    tokenAccounts.forEach(({ account, pubkey}) => {
        const parsed = unpackAccount(pubkey, account);
        if (new BN(parsed.amount.toString()).eq(new BN(1))) {
            const pda = PDAUtil.getPosition(ctx.program.programId, parsed.mint);
            pda_pubkeys.push(pda.publicKey);
        }
    });

    const candidates = await ctx.fetcher.getPositions(pda_pubkeys, IGNORE_CACHE);
    const position_addresses = [];
    pda_pubkeys.forEach((pubkey) => {
        const address = pubkey.toBase58();
        if (candidates.get(address) !== null) {
            position_addresses.push(address);
        }
    });

    return position_addresses;
};

export async function listTokenSymbols() {
    const tokensSymbols = {}
    const { data } = await axios.get("https://api.mainnet.orca.so/v1/token/list");
    data.tokens.forEach(({ mint, symbol }) => {
        if (symbol) tokensSymbols[mint] = symbol;
    })
    return tokensSymbols;
}
