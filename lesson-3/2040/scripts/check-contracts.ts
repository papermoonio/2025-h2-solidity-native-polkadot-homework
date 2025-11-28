import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { createPublicClient, http, formatEther } from "viem";
import { hardhat } from "viem/chains";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("🔍 检查本地链上的合约...\n");

  // 创建客户端连接到本地 Hardhat 网络
  const client = createPublicClient({
    chain: hardhat,
    transport: http(),
  });

  // 获取最新区块
  const blockNumber = await client.getBlockNumber();
  console.log(`📦 当前区块号: ${blockNumber}`);

  // 检查部署文件
  const deploymentPath = path.join(__dirname, "..", "ignition", "deployments", "chain-31337", "deployed_addresses.json");

  if (fs.existsSync(deploymentPath)) {
    console.log("\n📋 部署记录:");
    const deployments = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

    for (const [key, address] of Object.entries(deployments)) {
      console.log(`  ${key}: ${address}`);

      // 检查合约代码是否存在
      const code = await client.getCode({ address: address as `0x${string}` });
      if (code && code !== "0x") {
        console.log(`    ✅ 合约代码存在 (${code.length} 字节)`);

        // 尝试获取基本信息 (如果是 ERC20)
        try {
          const name = await client.readContract({
            address: address as `0x${string}`,
            abi: [{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"}],
            functionName: "name",
          });
          const symbol = await client.readContract({
            address: address as `0x${string}`,
            abi: [{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"}],
            functionName: "symbol",
          });
          const totalSupply = await client.readContract({
            address: address as `0x${string}`,
            abi: [{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}],
            functionName: "totalSupply",
          });

          console.log(`    📝 代币信息: ${name} (${symbol})`);
          console.log(`    💰 总供应量: ${formatEther(totalSupply as bigint)} ${symbol}`);
        } catch (error) {
          console.log(`    ⚠️  不是 ERC20 合约或读取失败`);
        }
      } else {
        console.log(`    ❌ 合约代码不存在`);
      }
      console.log("");
    }
  } else {
    console.log("❌ 未找到部署记录文件");
  }

  // 检查最近的交易
  console.log("🔄 最近交易:");
  const block = await client.getBlock({ blockTag: "latest", includeTransactions: true });

  if (block.transactions.length > 0) {
    console.log(`  最新区块包含 ${block.transactions.length} 笔交易`);
    // 显示最近几笔交易
    const recentTxs = block.transactions.slice(-3);
    for (const tx of recentTxs) {
      console.log(`    ${tx.hash}: ${tx.from} → ${tx.to || "合约创建"}`);
    }
  } else {
    console.log("  暂无交易记录");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 错误:", error);
    process.exit(1);
  });
