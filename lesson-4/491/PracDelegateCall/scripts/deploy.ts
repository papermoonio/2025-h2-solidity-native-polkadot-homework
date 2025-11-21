import { network } from "hardhat";
import { deployContract, polkaDev } from "./depLib.ts";    

async function main() {
    const { viem } = await network.connect({ network: "localhost" });
    const [client] = await viem.getWalletClients({chain: polkaDev});
    const publicClient = await viem.getPublicClient({chain: polkaDev});
    const [address] = await deployContract(client, publicClient, "Counter");
    console.log("Logic at:", address);
    const [proxy] = await deployContract(client, publicClient, "Proxy", [address]);
    console.log("Proxy at:", proxy);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });