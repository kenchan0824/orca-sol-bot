import { Connection, PublicKey } from "@solana/web3.js";
import {
    WhirlpoolContext, PDAUtil, PriceMath, 
    IGNORE_CACHE, PREFER_CACHE, ORCA_WHIRLPOOL_PROGRAM_ID
} from "@orca-so/whirlpools-sdk";
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();


export async function getContext() {
    const connection = new Connection(process.env.RPC_URL, 'confirmed');
    return WhirlpoolContext.from(connection, {}, ORCA_WHIRLPOOL_PROGRAM_ID);
}

export async function getPositionsFromMints(context, mints) {
    const possiblePDAs = mints.map(mint => {
        // Derive program address of Whirlpool's position
        const { publicKey: pda } = PDAUtil.getPosition(ORCA_WHIRLPOOL_PROGRAM_ID, mint);
        return pda;
    })

    // Try to get Whirlpool position data from PDA
    const positionsMap = await context.fetcher.getPositions(possiblePDAs, IGNORE_CACHE);

    const positionsData = []
    for (const [key, data] of positionsMap) {
        if (!data) continue;
        data.key = key
        positionsData.push(data)
    }

    return await getPositionsWithPool(context, positionsData)
};

export async function getPositionsByKeys(context, keys) {
    const positionsMap = await context.fetcher.getPositions(keys, PREFER_CACHE);    

    const positionsData = []
    for (const [key, data] of positionsMap) {
        data.key = key
        positionsData.push(data)
    }

    return await getPositionsWithPool(context, positionsData)
};

async function getTokensMap() {
    const tokensMap = {}
    const { data } = await axios.get("https://api.mainnet.orca.so/v1/token/list");
    for (const token of data.tokens) {
        if (!token.symbol) continue;
        tokensMap[token.mint] = token;
    }
    return tokensMap;
}

function checkTokensFlipped(mintA, mintB) {
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const WSOL_MINT = 'So11111111111111111111111111111111111111112';

    if (mintA == USDC_MINT) return true;
    if (mintA == WSOL_MINT) return (mintB !== USDC_MINT);
    
    return false;
}

async function getPositionsWithPool(context, positionsData) {
    const allPoolsAddress = positionsData.map(position => position.whirlpool)
    const poolsMap = await context.fetcher.getPools(allPoolsAddress, IGNORE_CACHE)
    const tokensMap = await getTokensMap()
    
    const positionsWithPool = positionsData.map(position => {
        const pool = poolsMap.get(position.whirlpool.toBase58());
    
        let tokenA = tokensMap[pool.tokenMintA]
        let tokenB = tokensMap[pool.tokenMintB]
        const poolPrice = +PriceMath.sqrtPriceX64ToPrice(pool.sqrtPrice, tokenA.decimals, tokenB.decimals);
        const lowerPrice = +PriceMath.tickIndexToPrice(position.tickLowerIndex, tokenA.decimals, tokenB.decimals);
        const upperPrice = +PriceMath.tickIndexToPrice(position.tickUpperIndex, tokenA.decimals, tokenB.decimals);

        const info = checkTokensFlipped(tokenA.mint, tokenB.mint) ?
            {
                tokenA: tokenB.symbol,
                tokenB: tokenA.symbol,
                poolPrice: 1/poolPrice, 
                lowerPrice: 1/upperPrice, 
                upperPrice: 1/lowerPrice
            } : {
                tokenA: tokenA.symbol,
                tokenB: tokenB.symbol,
                poolPrice, 
                lowerPrice, 
                upperPrice
            };
        info.key = position.key
        return info;
    });

    return positionsWithPool;
}

// import { getNftMintsByOwner } from './tokens.js'

// const ctx = await getContext()
// const mints = await getNftMintsByOwner(ctx.connection, '3cnckTTJqN5vLhnUvVQSXSwdbZsTFoi93bz4aqthnXX7')
// let positionsInfo = await getPositionsFromMints(ctx, mints)
// const keys = positionsInfo.map((position) => position.key)
// positionsInfo = await getPositionsByKeys(ctx, keys)
// console.log(positionsInfo)