const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 检查私钥对应的账户信息...\n");

  // 你的私钥
  const privateKey = "a5b83c63015ef08a0a7f7ac5c345c70544bb32d94824615125ba8e1c47b0a45e";
  
  // 创建钱包实例
  const wallet = new ethers.Wallet(privateKey);
  
  console.log("📊 账户信息:");
  console.log("地址:", wallet.address);
  console.log("私钥:", privateKey);
  console.log("公钥:", wallet.publicKey);
  
  // 连接到 Sepolia 网络
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  const connectedWallet = wallet.connect(provider);
  
  // 获取余额
  const balance = await provider.getBalance(wallet.address);
  console.log("\n💰 Sepolia 余额:", ethers.formatEther(balance), "ETH");
  
  // 生成助记词（如果需要）
  console.log("\n💡 提示：");
  console.log("1. 可以使用上面的地址在任何钱包中查看余额");
  console.log("2. 私钥可以导入到支持的钱包中");
  console.log("3. 确保复制时没有空格或换行");
  
  // 显示其他格式
  console.log("\n📋 其他格式（某些钱包可能需要）:");
  console.log("带0x前缀:", "0x" + privateKey);
  console.log("大写地址:", wallet.address.toUpperCase());
  console.log("小写地址:", wallet.address.toLowerCase());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
