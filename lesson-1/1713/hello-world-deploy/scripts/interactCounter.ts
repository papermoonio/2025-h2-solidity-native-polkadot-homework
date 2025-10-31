// scripts/interactCounter.ts
import { network, config } from "hardhat";
import { NetworkConnection } from "hardhat/types/network";

// 这是一个异步的 "main" 函数，脚本会从这里开始执行
async function main() {
  // --- 1. 连接到网络和钱包 ---
  // 这会连接到你通过 --network 命令行标志指定的网络
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [senderClient] = await viem.getWalletClients();

  const nc = viem as unknown as NetworkConnection
  console.log(`Connected to network: ${nc.networkName}`);
  console.log(`Using sender account: ${senderClient.account.address}`);

  // --- 2. [!!!] 指定你要交互的合约地址 ---
  //
  // !!! 你必须手动替换这个地址 !!!
  // 把它换成你运行 'pnpm hardhat ignition deploy ...' 后
  // 终端打印出来的那个 'CounterModule:counter' 的地址
  //
  const deployedCounterAddress = "0x072DfF8514A93aEaeebB8532c93C1Cb499c6dbc5";


  // --- 3. 连接到你已部署的合约 ---
  //
  // 这就是 [test/Counter.ts]
  // getContractAt 会获取一个指向 *现有* 合约的实例
  //
  console.log(`Connecting to Counter contract at: ${deployedCounterAddress}`);
  const counter = await viem.getContractAt(
    "Counter", // 合约名称 (必须与 .sol 文件名一致)
    deployedCounterAddress
    // 修复: 删除无效的 walletClient 属性
  );

  // --- 4. 读取合约的当前状态 (只读) ---
  //
  // 这类似于 [test/Counter.ts]
  //
  console.log("Reading initial counter value...");
  const initialValue = await counter.read.x(); // 假设你的 .sol 变量是 'x'
  console.log(`Initial counter value: ${initialValue}`);

  // --- 5. 发送一个交易来修改状态 (写入) ---
  //
  // 这类似于 [test/Counter.ts]
  //
  console.log("Sending 'inc()' transaction...");
  const txHash = await counter.write.inc();
  console.log(`Transaction sent! Hash: ${txHash}`);

  // --- 6. 等待交易被确认 ---
  console.log("Waiting for transaction confirmation...");
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("Transaction confirmed!");

  // --- 7. 再次读取状态，进行"手动验证" ---
  const newValue = await counter.read.x();
  console.log(`New counter value: ${newValue}`);

  // --- 8. 打印人类可读的验证结果 ---
  //
  // 这就是 [test/Counter.ts]
  //
  if (newValue === initialValue + 1n) {
    console.log("✅ Success! The counter was incremented correctly.");
  } else {
    console.log("❌ Failed! The counter value did not change as expected.");
  }
}

// 运行 main 函数并捕获任何错误
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});