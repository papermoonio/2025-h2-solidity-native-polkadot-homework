import { defineChain, type WalletClient, type PublicClient, verifyMessage} from "viem";
import type { Artifact } from "hardhat/types/artifacts";

const rpcUrl = "http://localhost:8545";
export const polkaDev = defineChain({
    id: 420420420,
    name: 'localhost',
    nativeCurrency: {
        decimals: 18,
        name: 'DOT',
        symbol: 'DOT',
    },
    rpcUrls: {
        default: { http: [rpcUrl] },
    },

})

export async function deployContract(client: WalletClient, pubClient: PublicClient, contractName: string, args?: any[]): Promise<[`0x${string}`, Artifact]> {
    const { default: contract } = await import(
        `../artifacts/contracts/${contractName}.sol/${contractName}.json`
        , { with: { type: 'json' } });
    const hash = await client.deployContract({
        abi: contract.abi,
        bytecode: contract.bytecode as `0x${string}`,
        args
    } as any);
    console.log("Deployment hash:", hash, ` | block number: ${await pubClient.getBlockNumber()}`);
    const {contractAddress, blockNumber} = await pubClient.waitForTransactionReceipt({hash: hash});
    if (!contractAddress) { 
        throw new Error("Deployment failed");
    }
    console.log("Contract address:", contractAddress, ` | block number: ${blockNumber}`);
    return [contractAddress, contract as Artifact];
}