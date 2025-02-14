import { PositionInfoLayout, getPdaPersonalPositionAddress } from "@raydium-io/raydium-sdk"
import { Connection, PublicKey } from "@solana/web3.js";
import { getNftMintsByOwner } from './tokens.js';
import dotenv from 'dotenv';
dotenv.config();

const RAY_CLMM_PROGRAM_ID = 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK'

const connection = new Connection(process.env.RPC_URL, 'confirmed')
const mintAddresses = await getNftMintsByOwner(connection, '3cnckTTJqN5vLhnUvVQSXSwdbZsTFoi93bz4aqthnXX7')
const pdaList = mintAddresses.map(
    mint => getPdaPersonalPositionAddress(new PublicKey(RAY_CLMM_PROGRAM_ID), mint).publicKey
) 
const possiblePositions = await connection.getMultipleAccountsInfo(pdaList)
const positions = possiblePositions.filter(position => position != null);
const positionsInfo = positions.map(
    (position) => PositionInfoLayout.decode(position.data)
);
// console.log(positionsInfo)

