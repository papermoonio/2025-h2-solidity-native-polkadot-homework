import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    // 1. 部署 Logic 合约
    const Logic = await ethers.getContractFactory("Logic");
    const logic = await Logic.deploy();
    await logic.waitForDeployment();
    const logicAddress = await logic.getAddress();
    console.log("Logic contract deployed to:", logicAddress);

    // 2. 部署 Proxy 合约，传入 logic 地址
    const Proxy = await ethers.getContractFactory("Proxy");
    const proxy = await Proxy.deploy(logicAddress);
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    console.log("Proxy contract deployed to:", proxyAddress);

    // 3. 【可选】通过代理初始化状态（调用 initialize）
    console.log("Initializing proxy via logic...");
    const logicAsProxy = Logic.attach(proxyAddress); // 使用 Logic ABI 操作 Proxy 地址
    const initTx = await logicAsProxy.initialize();
    await initTx.wait();
    console.log("Proxy initialized! Owner set to:", deployer.address);

    // 4. 【可选】验证初始值
    const value = await logicAsProxy.getValue();
    console.log("Initial value in proxy:", value.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });