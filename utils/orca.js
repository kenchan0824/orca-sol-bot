import { Connection, PublicKey } from "@solana/web3.js";
import {
    WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, PDAUtil, IGNORE_CACHE
    , buildWhirlpoolClient, PriceMath
} from "@orca-so/whirlpools-sdk";
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
import { sleep } from './async.js';


export async function getContext() {
    const connection = new Connection(process.env.RPC_URL, 'confirmed');
    return WhirlpoolContext.from(connection, {}, ORCA_WHIRLPOOL_PROGRAM_ID);
}

export async function getPositionsFromMints(context, mints) {
    const possiblePositionAddresses = mints.map(mint => {
        // Derive program address of Whirlpool's position
        const { publicKey: pda } = PDAUtil.getPosition(ORCA_WHIRLPOOL_PROGRAM_ID, mint);
        return pda;
    })

    // Try to get Whirlpool position data from PDA
    const allPositionInfos = await context.fetcher.getPositions(possiblePositionAddresses, IGNORE_CACHE);    
    const positionAddresses = possiblePositionAddresses.filter(
        address => allPositionInfos.get(address.toBase58()) != null
    )
    return positionAddresses;
};

export async function getTokenSymbols() {
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

export async function getPositionsInfo(ctx, positionAddresses) {
    const client = buildWhirlpoolClient(ctx);
    const pubkeys = positionAddresses.map(pda => new PublicKey(pda))
    await sleep(2000);
    const positions = await client.getPositions(pubkeys)
    const positionsPool = Object.fromEntries(
        Object.entries(positions).map(
            ([key, value]) => [key, value.getData().whirlpool]
        )
    )

    await sleep(2000);
    const pools = await client.getPools(Object.values(positionsPool))
    const poolsMap = Object.fromEntries(
        pools.map(pool => [pool.address, pool])
    )

    const tokenSymbols = await getTokenSymbols();
    
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
                , token_a: tokenSymbols[token_b_mint]
                , token_b: tokenSymbols[token_a_mint]
                , pool_price: 1/pool_price
                , lower_price: 1/upper_price
                , upper_price: 1/lower_price
            };
        }

        return {
            pda: positionAddress
            , token_a: tokenSymbols[token_a_mint]
            , token_b: tokenSymbols[token_b_mint]
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