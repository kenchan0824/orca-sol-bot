import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import {
    WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, PDAUtil, IGNORE_CACHE
    , buildWhirlpoolClient, PriceMath
} from "@orca-so/whirlpools-sdk";
import { TOKEN_PROGRAM_ID, unpackAccount } from "@solana/spl-token";
import BN from "bn.js";
import axios from 'axios';


export async function getContext() {
    const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    const ctx = WhirlpoolContext.from(connection, {}, ORCA_WHIRLPOOL_PROGRAM_ID);
    ctx.tokenSymbols = await listTokenSymbols();
    return ctx;
}

export async function listPositionsByOwner(ctx, wallet_address) {
    const { value: tokenAccounts } = await ctx.connection.getTokenAccountsByOwner(
        new PublicKey(wallet_address), { programId: TOKEN_PROGRAM_ID }
    );

    const pda_pubkeys = [];

    // Get all token accounts
    tokenAccounts.forEach(({ account, pubkey}) => {
        const parsed = unpackAccount(pubkey, account);
        
        // Ignores empty token accounts and non-NFTs
        if (new BN(parsed.amount.toString()).eq(new BN(1))) {
            
            // Derive the address of Whirlpool's position from the mint address
            const pda = PDAUtil.getPosition(ctx.program.programId, parsed.mint);
            pda_pubkeys.push(pda.publicKey);
        }
    });

    /// Try to get data from Whirlpool position addresses
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

export async function getPositionDetails(ctx, position_address) {
    const client = buildWhirlpoolClient(ctx);
    const pubkey = new PublicKey(position_address);
    const position = (await client.getPosition(pubkey)).getData();
    
    // Get the pool to which the position belongs
    const pool = await client.getPool(position.whirlpool);
    const token_a = pool.getTokenAInfo();
    const token_b = pool.getTokenBInfo();

    const pool_price = PriceMath.sqrtPriceX64ToPrice(pool.getData().sqrtPrice, token_a.decimals, token_b.decimals);
    
    // Get the price range of the position
    const lower_price = PriceMath.tickIndexToPrice(position.tickLowerIndex, token_a.decimals, token_b.decimals);
    const upper_price = PriceMath.tickIndexToPrice(position.tickUpperIndex, token_a.decimals, token_b.decimals);

    return {
        token_a: ctx.tokenSymbols[token_a.mint.toBase58()]
        , token_b: ctx.tokenSymbols[token_b.mint.toBase58()]
        , pool_price
        , lower_price
        , upper_price
    }
}
