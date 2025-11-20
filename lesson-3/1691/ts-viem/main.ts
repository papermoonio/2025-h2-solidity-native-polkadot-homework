import { createPublicClient, createWalletClient, defineChain, http, PrivateKeyAccount } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ABI, BYTECODE } from "./erc20";

export const localChain = (url: string) => defineChain({
    id: 31337,
    name: "Testnet",
    network: "Testnet",
    nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
    },
    rpcUrls: {
        default: { http: [url] },
    },
    testnet: true,
});

async function main() {
    const url = "http://127.0.0.1:8545";
    const publicClient = createPublicClient({
        chain: localChain(url),
        transport: http(),
    });

    publicClient.watchBlockNumber({
        onBlockNumber: (blockNumber) => {
            console.log("New block mined:", blockNumber);
        },
        onError: (error) => {
            console.error("Error watching block number:", error);
        }
    })

    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const wallet = privateKeyToAccount(privateKey);
    const address = wallet.address;
    const balance = await publicClient.getBalance({ address });
    const nonce = await publicClient.getTransactionCount({ address });

    console.log("Wallet address:", address);
    console.log("Wallet balance (in ether):", balance);
    console.log("Transaction count (nonce):", nonce);

    // const txHash = transferEther(wallet, url, "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", 1000000000000000000n);
    // const receipt = await publicClient.waitForTransactionReceipt({ hash: await txHash });
    // console.log("Transfer Transaction receipt:", receipt);

    const walletClient = createWalletClient({ account: wallet, chain: localChain(url), transport: http() });
    const contract = await walletClient.deployContract({
        abi: ABI,
        bytecode: BYTECODE,
        args: ["MyToken", "MTK", 18, 1000000],
    });
    const receipt2 = await publicClient.waitForTransactionReceipt({ hash: contract });
    console.log("Deploy Contract Transaction receipt:", receipt2);

    if(typeof receipt2.contractAddress !== 'string' || !receipt2.contractAddress) {
        throw new Error("Contract address is undefined");
    }

    const totalSupply = await publicClient.readContract({
        address: receipt2.contractAddress,
        abi: ABI,
        functionName: 'totalSupply',
    });
    console.log("Total Supply:", totalSupply);

}

async function transferEther(wallet: PrivateKeyAccount, url: string, to: `0x${string}`, amount: bigint): Promise<`0x${string}`> {
    const walletClient = createWalletClient({ account: wallet, chain: localChain(url), transport: http() });
    const txHash = await walletClient.sendTransaction({
        to: to,
        value: amount,
    });
    console.log(`Transferred ${amount} ETH to ${to}. Transaction hash: ${txHash}`);
    return txHash;
}

main().catch((error) => {
    console.error("Error in main execution:", error);
});