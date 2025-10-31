import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERC20 Contract", function () {
    // 测试中使用的 token 变量
    let token: any;

    beforeEach(async function () {
        // 在每个测试用例之前部署一个新的合约实例以确保测试隔离
        const Token = await ethers.getContractFactory("ERC20");
        token = await Token.deploy("MyToken", "MTK", 0, 1000);
        await token.waitForDeployment();
    });

    it("Should set the right name and symbol", async function () {
        // 验证合约的名称、符号和小数位是否按预期设置
        expect(await token.name()).to.equal("MyToken");
        expect(await token.symbol()).to.equal("MTK");
        expect(await token.decimals()).to.equal(0n);
    });

    it("Should assign the initial supply to the deployer", async function () {
        // 部署者应当拥有初始发行量
        const [owner] = await ethers.getSigners();
        expect(await token.totalSupply()).to.equal(1000n);
        expect(await token.balanceOf(owner.address)).to.equal(1000n);
    });

    it("Should transfer tokens between accounts", async function () {
        // 测试从部署者向另一个地址转账并检查余额变化
        const [owner, addr1] = await ethers.getSigners();
        const tx = await token.transfer(addr1.address, 100);
        await tx.wait();
        expect(await token.balanceOf(owner.address)).to.equal(900n);
        expect(await token.balanceOf(addr1.address)).to.equal(100n);
    });

    it("Should approve and allow transferFrom", async function () {
        // 测试 approve 授权与 transferFrom 授权转移流程
        const [owner, addr1, addr2] = await ethers.getSigners();
        let tx = await token.transfer(addr1.address, 100);
        await tx.wait();

        // addr1 授权 owner 花费 50
        tx = await token.connect(addr1).approve(owner.address, 50);
        await tx.wait();

        // owner 使用 transferFrom 从 addr1 转移到 addr2
        tx = await token.connect(owner).transferFrom(addr1.address, addr2.address, 50);
        await tx.wait();

        // 检查最终余额
        expect(await token.balanceOf(addr1.address)).to.equal(50n);
        expect(await token.balanceOf(addr2.address)).to.equal(50n);
    });
});