import { Connection, PublicKey } from "@solana/web3.js";
import {
    WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, PDAUtil, IGNORE_CACHE
    , buildWhirlpoolClient, PriceMath
} from "@orca-so/whirlpools-sdk";
import { TOKEN_PROGRAM_ID, unpackAccount } from "@solana/spl-token";
import BN from "bn.js";
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
import { sleep } from './async.js';


export async function getContext() {
    const connection = new Connection(process.env.RPC_URL, 'confirmed');
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
            const {publicKey, _} = PDAUtil.getPosition(ctx.program.programId, parsed.mint);
            pda_pubkeys.push(publicKey);
        }
    });

    // Try to get data from Whirlpool position addresses
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

function checkTokensFlipped(token_a, token_b) {
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const WSOL_MINT = 'So11111111111111111111111111111111111111112';

    if (token_a == USDC_MINT) return true;
    if (token_a == WSOL_MINT) return (token_b !== USDC_MINT);
    
    return false;
}

export async function getPositionsDetails(ctx, positionAddresses) {
    const client = buildWhirlpoolClient(ctx);
    const pubkeys = positionAddresses.map(pda => new PublicKey(pda))
    const positions = await client.getPositions(pubkeys)
    await sleep(500);
    const positionsPool = Object.fromEntries(
        Object.entries(positions).map(
            ([key, value]) => [key, value.getData().whirlpool]
        )
    )

    const pools = await client.getPools(Object.values(positionsPool))
    await sleep(500);
    const poolsMap = Object.fromEntries(
        pools.map(pool => [pool.address, pool])
    )

    return Object.entries(positionsPool).map(([positionAddress, poolAddress]) => {

        const position = positions[positionAddress].getData()
        const pool = poolsMap[poolAddress] 
        const token_a = pool.getTokenAInfo();
        const token_b = pool.getTokenBInfo();
    
        const pool_price = +PriceMath.sqrtPriceX64ToPrice(pool.getData().sqrtPrice, token_a.decimals, token_b.decimals);
        
        // Get the price range of the position
        const lower_price = +PriceMath.tickIndexToPrice(position.tickLowerIndex, token_a.decimals, token_b.decimals);
        const upper_price = +PriceMath.tickIndexToPrice(position.tickUpperIndex, token_a.decimals, token_b.decimals);
    
        const token_a_mint = token_a.mint.toBase58();
        const token_b_mint = token_b.mint.toBase58();
    
        if (checkTokensFlipped(token_a_mint, token_b_mint)) {
            return {
                pda: positionAddress
                , token_a: ctx.tokenSymbols[token_b_mint]
                , token_b: ctx.tokenSymbols[token_a_mint]
                , pool_price: 1/pool_price
                , lower_price: 1/upper_price
                , upper_price: 1/lower_price
            };
        }

        return {
            pda: positionAddress
            , token_a: ctx.tokenSymbols[token_a_mint]
            , token_b: ctx.tokenSymbols[token_b_mint]
            , pool_price
            , lower_price
            , upper_price
        };
    });
}

// const ctx = await getContext()
// const client = buildWhirlpoolClient(ctx)
// const positionAddresses = await listPositionsByOwner(ctx, 'FEYSHggf3DNhfvKZiSGkSTmswurZSnn26gNJEnxcZSqk')
// const details = await getPositionsDetails(ctx, positionAddresses)
// console.log(details)