import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, unpackAccount } from "@solana/spl-token";
import BN from "bn.js";

export async function  getNftMintsByOwner(connection, ownerAddress) {
    const nftMints = [];

    const { value: tokenAccounts } = await connection.getTokenAccountsByOwner(
        new PublicKey(ownerAddress), { programId: TOKEN_PROGRAM_ID }
    );

    for (const { pubkey, account } of tokenAccounts) {
        const tokenAccountInfo = unpackAccount(pubkey, account);
        if (!new BN(tokenAccountInfo.amount).eq(new BN(1))) continue;

        nftMints.push(tokenAccountInfo.mint)
    }

    return nftMints;
}
