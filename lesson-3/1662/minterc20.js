import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

// === 配置区 ===
// 你要替换成自己的部署信息
const CONTRACT_ADDRESS = "0x970951a12F975E6762482ACA81E57D5A2A4e73F4"; // 合约地址
const RPC_URL = "http://localhost:8545"; // 示例，可替换为你的网络 RPC
const PRIVATE_KEY = process.env.PRIVATE_KEY; // 钱包私钥（在 .env 中存放）

// === ABI 片段，只需要用到的函数即可 ===
const ABI = [
  "function mintToken() public",
  "function canMint(address _address) public view returns (bool)",
  "function lastMintTime(address) view returns (uint256)",
  "function interval() view returns (uint256)"
];

async function main() {
  // 1️⃣ 初始化 provider 和 signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // 2️⃣ 连接合约
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  console.log(`Connected to contract at ${CONTRACT_ADDRESS}`);
  console.log(`Using wallet: ${wallet.address}`);

  // 3️⃣ 检查是否可以铸造
  const canMint = await contract.canMint(wallet.address);
  console.log(`Can mint now: ${canMint}`);

  if (!canMint) {
    const last = await contract.lastMintTime(wallet.address);
    const interval = await contract.interval();
    const next = Number(last) + Number(interval);
    console.log(`You can mint again at: ${new Date(next * 1000).toLocaleString()}`);
    return;
  }

  // 4️⃣ 调用 mintToken()
  console.log("Sending mint transaction...");
  const tx = await contract.mintToken();
  console.log("Transaction sent:", tx.hash);

  // 5️⃣ 等待交易完成
  const receipt = await tx.wait();
  console.log("✅ Mint successful! Block:", receipt.blockNumber);
}

main().catch((err) => {
  console.error("❌ Error:", err);
});
