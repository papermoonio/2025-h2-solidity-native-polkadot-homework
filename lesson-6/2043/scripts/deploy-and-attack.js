const { ethers } = require("hardhat");

async function main() {
    console.log("开始部署和演示重入攻击...\n");

    const [owner, user1] = await ethers.getSigners();

    // 1. 部署有漏洞的银行合约
    console.log("1. 部署有重入漏洞的银行合约...");
    const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
    const vulnerableBank = await VulnerableBank.deploy();
    await vulnerableBank.waitForDeployment();
    const vulnerableBankAddress = await vulnerableBank.getAddress();
    console.log("VulnerableBank 部署地址:", vulnerableBankAddress);

    // 2. 部署攻击者合约
    console.log("\n2. 部署攻击者合约...");
    const Attacker = await ethers.getContractFactory("Attacker");
    const attacker = await Attacker.deploy(vulnerableBankAddress);
    await attacker.waitForDeployment();
    const attackerAddress = await attacker.getAddress();
    console.log("Attacker 部署地址:", attackerAddress);

    // 3. 模拟正常用户存款
    console.log("\n3. 模拟正常用户存款...");
    await vulnerableBank.connect(user1).deposit({ value: ethers.parseEther("3") });
    console.log("用户1存款: 3 ETH");

    // 4. 检查初始状态
    console.log("\n4. 攻击前状态:");
    const initialBankBalance = await ethers.provider.getBalance(vulnerableBankAddress);
    console.log("银行合约余额:", ethers.formatEther(initialBankBalance), "ETH");

    // 5. 执行攻击
    console.log("\n5. 开始重入攻击...");
    await attacker.attack({ value: ethers.parseEther("1") });

    // 6. 检查攻击结果
    console.log("\n6. 攻击后状态:");
    const finalBankBalance = await ethers.provider.getBalance(vulnerableBankAddress);
    const attackerBalance = await attacker.getBalance();

    console.log("银行合约余额:", ethers.formatEther(finalBankBalance), "ETH");
    console.log("攻击者盗取金额:", ethers.formatEther(attackerBalance), "ETH");

    // 7. 提取盗取的资金
    console.log("\n7. 提取盗取的资金...");
    await attacker.withdrawStolenFunds();

    console.log("\n攻击演示完成!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });