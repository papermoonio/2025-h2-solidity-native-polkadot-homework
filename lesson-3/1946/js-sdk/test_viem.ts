import {
  createPublicClient,
  createWalletClient,
  defineChain,
  hexToBigInt,
  http,
  parseEther,
} from "viem";
import { ABI, BYTECODE } from "./erc20";
import { privateKeyToAccount } from "viem/accounts";

export const localChain = (url: string) =>
  defineChain({
    id: 420420420,
    name: "Testnet",
    network: "Testnet",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
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
  const privateKey =
    "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133";
  const wallet = privateKeyToAccount(privateKey);
  //   const address = wallet.address;
  //   const balance = await publicClient.getBalance({ address: address });
  //   console.log(`balance is ${balance}`);
  //   const nonce = await publicClient.getTransactionCount({ address: address });
  //   console.log(`nonce is ${nonce}`);

  const walletClient = createWalletClient({
    account: wallet,
    chain: localChain(url),
    transport: http(),
  });
  //   const txHash = await walletClient.sendTransaction({
  //     to: "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
  //     value: hexToBigInt("0x10000"),
  //   });
  //   console.log(`txHash hash: ${txHash}`);
  //   const receipt = await publicClient.waitForTransactionReceipt({
  //     hash: txHash,
  //   });
  //   console.log(`receipt is ${receipt}`);

  //   const contract = await walletClient.deployContract({
  //     abi: ABI,
  //     bytecode: BYTECODE,
  //     args: ["name", "symbol", 18, 100000],
  //   });
  //   const receipt = await publicClient.waitForTransactionReceipt({
  //     hash: contract,
  //   });

  //   console.log(
  //     "Deployment receipt:",
  //     JSON.stringify(receipt, (key, value) =>
  //       typeof value === "bigint" ? value.toString() : value
  //     )
  //   );
  //   // 检查部署交易是否成功
  //   if (receipt.status !== "success") {
  //     throw new Error("Contract deployment failed");
  //   }

  //   const contractAddress = receipt.contractAddress;
  //   if (
  //     typeof contractAddress !== "string" ||
  //     !contractAddress.startsWith("0x")
  //   ) {
  //     throw new Error("Contract deployment failed");
  //   }

  //   console.log(`contractAddress is ${contractAddress}`);

  //   const totalSupply = await publicClient.readContract({
  //     address: contractAddress,
  //     abi: ABI,
  //     functionName: "totalSupply",
  //     args: [],
  //   });
  //   console.log(`totalSupply is ${totalSupply}`);

  publicClient.watchBlockNumber({
    onBlockNumber: (blockNumber) => {
      console.log(`blockNumber is ${blockNumber}`);
    },
    onError: (error) => {
      console.error(`error is ${error}`);
    },
  });
}

main().catch((error) => {
  console.error(error);
});
