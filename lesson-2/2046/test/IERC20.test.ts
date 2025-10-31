import { expect } from "chai";
import { ethers } from "hardhat";

describe("IERC20 Interface", function () {
    let token: any;

    beforeEach(async function () {
        const Token = await ethers.getContractFactory("ERC20");
        console.log(Token)
        // ethers v6: deploy() 返回合约实例，使用 waitForDeployment() 等待部署完成
        token = await Token.deploy("Test Token", "TT", 0, 1000);
        await token.waitForDeployment();
    });

    it("should return the total supply", async function () {
        const totalSupply = await token.totalSupply();
        // ethers v6 返回 BigInt，可直接与 1000n 比较
        expect(totalSupply).to.equal(1000n);
    });

    it("should return the balance of an account", async function () {
        const [owner] = await ethers.getSigners();
        const balance = await token.balanceOf(owner.address);
        expect(balance).to.equal(1000n);
    });

    it("should transfer tokens between accounts", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const tx = await token.transfer(addr1.address, 100);
        await tx.wait();
        const balanceOwner = await token.balanceOf(owner.address);
        const balanceAddr1 = await token.balanceOf(addr1.address);
        expect(balanceOwner).to.equal(900n);
        expect(balanceAddr1).to.equal(100n);
    });

    it("should approve tokens for spending", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const tx = await token.approve(addr1.address, 100);
        await tx.wait();
        const allowance = await token.allowance(owner.address, addr1.address);
        expect(allowance).to.equal(100n);
    });

    it("should transfer tokens from one account to another", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        let tx = await token.transfer(addr1.address, 100);
        await tx.wait();
        tx = await token.connect(addr1).approve(owner.address, 50);
        await tx.wait();
        tx = await token.connect(owner).transferFrom(addr1.address, addr2.address, 50);
        await tx.wait();
        const balanceAddr1 = await token.balanceOf(addr1.address);
        const balanceAddr2 = await token.balanceOf(addr2.address);
        expect(balanceAddr1).to.equal(50n);
        expect(balanceAddr2).to.equal(50n);
    });
});