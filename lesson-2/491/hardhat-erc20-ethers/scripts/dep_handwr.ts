import {network} from "hardhat";
import { defineChain } from "viem";

const rpcUrl = "http://localhost:8545";
    const polkaDev = defineChain({
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

const {viem} = await network.connect({network: "localhost"})
const publicClient = await viem.getPublicClient();
// const walletClient = await viem.getWalletClients({chain: polkaDev});
const counter = await viem.deployContract("Counter");
console.log("Latest block number:", await publicClient.getBlockNumber());
console.log("Counter address:", counter.address);

await counter.write.incBy([100n]);
console.log("Counter value:", await counter.read.x());
