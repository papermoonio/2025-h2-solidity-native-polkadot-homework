const { ethers } = require("hardhat");

async function main() {
    console.log("开始部署ERC20代币合约...");

    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("部署者地址:", deployer.address);
    console.log("部署者余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

    // 部署合约
    const ERC20Token = await ethers.getContractFactory("ERC20Token");
    const token = await ERC20Token.deploy("My Test Token", "MTT", 1000000); // 1,000,000 tokens

    await token.waitForDeployment();

    const tokenAddress = await token.getAddress();
    console.log("ERC20代币合约已部署到:", tokenAddress);

    // 显示合约信息
    console.log("\n=== 合约信息 ===");
    console.log("代币名称:", await token.name());
    console.log("代币符号:", await token.symbol());
    console.log("代币精度:", await token.decimals());
    console.log("总供应量:", ethers.formatEther(await token.totalSupply()), "MTT");
    console.log("部署者余额:", ethers.formatEther(await token.balanceOf(deployer.address)), "MTT");

    // 获取测试账户
    const accounts = await ethers.getSigners();

    if (accounts.length < 2) {
        console.log("\n只有一个账户可用，跳过功能测试");
        console.log("当前余额:", ethers.formatEther(await token.balanceOf(deployer.address)), "MTT");
        console.log("\n部署完成！");
        return;
    }

    const recipient = accounts[1];
    const spender = accounts[1]; // 使用第二个账户作为授权者

    console.log("\n=== 开始功能测试 ===");
    console.log("测试账户1 (部署者):", deployer.address);
    console.log("测试账户2 (接收者):", recipient.address);

    // 1. 基本转账测试
    console.log("\n1. 基本转账测试");
    const transferAmount = ethers.parseEther("1000");
    console.log(`向 ${recipient.address} 转账 1000 MTT...`);
    const transferTx = await token.transfer(recipient.address, transferAmount);
    await transferTx.wait();

    console.log("转账后余额:");
    console.log("部署者余额:", ethers.formatEther(await token.balanceOf(deployer.address)), "MTT");
    console.log("接收者余额:", ethers.formatEther(await token.balanceOf(recipient.address)), "MTT");

    // 2. 授权测试
    console.log("\n2. 授权测试");
    const approveAmount = ethers.parseEther("500");
    console.log(`授权 ${spender.address} 使用 500 MTT...`);
    const approveTx = await token.approve(spender.address, approveAmount);
    await approveTx.wait();

    const allowance = await token.allowance(deployer.address, spender.address);
    console.log("当前授权额度:", ethers.formatEther(allowance), "MTT");

    // 3. 授权转账测试
    console.log("\n3. 授权转账测试");
    const transferFromAmount = ethers.parseEther("200");
    console.log(`从部署者账户向接收者转账 ${ethers.formatEther(transferFromAmount)} MTT...`);
    const transferFromTx = await token.connect(spender).transferFrom(deployer.address, recipient.address, transferFromAmount);
    await transferFromTx.wait();

    console.log("授权转账后余额:");
    console.log("部署者余额:", ethers.formatEther(await token.balanceOf(deployer.address)), "MTT");
    console.log("接收者余额:", ethers.formatEther(await token.balanceOf(recipient.address)), "MTT");

    const remainingAllowance = await token.allowance(deployer.address, spender.address);
    console.log("剩余授权额度:", ethers.formatEther(remainingAllowance), "MTT");

    // 4. 铸造测试
    console.log("\n4. 铸造测试");
    const mintAmount = ethers.parseEther("5000");
    console.log(`铸造 ${ethers.formatEther(mintAmount)} MTT 给接收者...`);
    const mintTx = await token.mint(recipient.address, mintAmount);
    await mintTx.wait();

    console.log("铸造后状态:");
    console.log("总供应量:", ethers.formatEther(await token.totalSupply()), "MTT");
    console.log("接收者余额:", ethers.formatEther(await token.balanceOf(recipient.address)), "MTT");

    // 5. 销毁测试
    console.log("\n5. 销毁测试");
    const burnAmount = ethers.parseEther("1000");
    console.log(`销毁接收者的 ${ethers.formatEther(burnAmount)} MTT...`);
    const burnTx = await token.connect(recipient).burn(burnAmount);
    await burnTx.wait();

    console.log("销毁后状态:");
    console.log("总供应量:", ethers.formatEther(await token.totalSupply()), "MTT");
    console.log("接收者余额:", ethers.formatEther(await token.balanceOf(recipient.address)), "MTT");

    // 6. 批量转账测试
    console.log("\n6. 批量转账测试");
    const batchAmount = ethers.parseEther("100");
    console.log(`执行多次小额转账测试...`);

    for (let i = 0; i < 3; i++) {
        const batchTx = await token.transfer(recipient.address, batchAmount);
        await batchTx.wait();
        console.log(`第 ${i + 1} 次转账完成`);
    }

    console.log("批量转账后余额:");
    console.log("部署者余额:", ethers.formatEther(await token.balanceOf(deployer.address)), "MTT");
    console.log("接收者余额:", ethers.formatEther(await token.balanceOf(recipient.address)), "MTT");

    // 7. 授权更新测试
    console.log("\n7. 授权更新测试");
    const newApproveAmount = ethers.parseEther("1000");
    console.log(`更新授权额度为 ${ethers.formatEther(newApproveAmount)} MTT...`);
    const updateApproveTx = await token.approve(spender.address, newApproveAmount);
    await updateApproveTx.wait();

    const updatedAllowance = await token.allowance(deployer.address, spender.address);
    console.log("更新后授权额度:", ethers.formatEther(updatedAllowance), "MTT");

    // 8. Gas消耗统计
    console.log("\n8. Gas消耗统计");
    const gasTestAmount = ethers.parseEther("1");

    // 测试转账gas
    const gasTransferTx = await token.transfer(recipient.address, gasTestAmount);
    const gasTransferReceipt = await gasTransferTx.wait();
    console.log("转账Gas消耗:", gasTransferReceipt.gasUsed.toString());

    // 测试授权gas
    const gasApproveTx = await token.approve(spender.address, gasTestAmount);
    const gasApproveReceipt = await gasApproveTx.wait();
    console.log("授权Gas消耗:", gasApproveReceipt.gasUsed.toString());

    // 测试授权转账gas
    const gasTransferFromTx = await token.connect(spender).transferFrom(deployer.address, recipient.address, gasTestAmount);
    const gasTransferFromReceipt = await gasTransferFromTx.wait();
    console.log("授权转账Gas消耗:", gasTransferFromReceipt.gasUsed.toString());

    // 9. 最终状态总结
    console.log("\n=== 最终状态总结 ===");
    console.log("合约地址:", tokenAddress);
    console.log("总供应量:", ethers.formatEther(await token.totalSupply()), "MTT");
    console.log("部署者余额:", ethers.formatEther(await token.balanceOf(deployer.address)), "MTT");
    console.log("接收者余额:", ethers.formatEther(await token.balanceOf(recipient.address)), "MTT");
    console.log("剩余授权额度:", ethers.formatEther(await token.allowance(deployer.address, spender.address)), "MTT");

    console.log("\n🎉 所有功能测试完成！ERC20合约运行正常！");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("部署失败:", error);
        process.exit(1);
    });