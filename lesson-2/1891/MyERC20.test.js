const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyERC20", function () {
    let MyERC20;
    let token;
    let owner;
    let addr1;
    let addr2;
    const name = "MyToken";
    const symbol = "MTK";
    const decimals = 18;
    const initialSupply = 1000;

    beforeEach(async function () {
        // 部署合约前的准备
        [owner, addr1, addr2] = await ethers.getSigners();
        MyERC20 = await ethers.getContractFactory("MyERC20");
        token = await MyERC20.deploy(name, symbol, decimals, initialSupply);
        await token.deployed();
    });

    // 测试元数据
    describe("Metadata", function () {
        it("Should have correct name", async function () {
            expect(await token.name()).to.equal(name);
        });

        it("Should have correct symbol", async function () {
            expect(await token.symbol()).to.equal(symbol);
        });

        it("Should have correct decimals", async function () {
            expect(await token.decimals()).to.equal(decimals);
        });
    });

    // 测试供应和余额
    describe("Supply and Balances", function () {
        it("Should set total supply correctly", async function () {
            const expectedSupply = ethers.BigNumber.from(initialSupply).mul(
                ethers.BigNumber.from(10).pow(decimals)
            );
            expect(await token.totalSupply()).to.equal(expectedSupply);
        });

        it("Should set owner balance correctly", async function () {
            const expectedSupply = ethers.BigNumber.from(initialSupply).mul(
                ethers.BigNumber.from(10).pow(decimals)
            );
            expect(await token.balanceOf(owner.address)).to.equal(expectedSupply);
        });
    });

    // 测试转账功能
    describe("Transfers", function () {
        it("Should transfer tokens between accounts", async function () {
            const transferAmount = ethers.utils.parseEther("100");

            // 转账
            await token.transfer(addr1.address, transferAmount);
            expect(await token.balanceOf(addr1.address)).to.equal(transferAmount);

            // 二次转账
            await token.connect(addr1).transfer(addr2.address, transferAmount.div(2));
            expect(await token.balanceOf(addr2.address)).to.equal(transferAmount.div(2));
            expect(await token.balanceOf(addr1.address)).to.equal(transferAmount.div(2));
        });

        it("Should fail if sender has insufficient balance", async function () {
            const largeAmount = ethers.utils.parseEther("1000000");
            await expect(
                token.connect(addr1).transfer(owner.address, largeAmount)
            ).to.be.revertedWith("Insufficient balance");
        });

        it("Should fail to transfer to zero address", async function () {
            const transferAmount = ethers.utils.parseEther("100");
            await expect(
                token.transfer(ethers.constants.AddressZero, transferAmount)
            ).to.be.revertedWith("Transfer to zero address");
        });

        it("Should emit Transfer event", async function () {
            const transferAmount = ethers.utils.parseEther("100");
            await expect(token.transfer(addr1.address, transferAmount))
                .to.emit(token, "Transfer")
                .withArgs(owner.address, addr1.address, transferAmount);
        });
    });

    // 测试授权功能
    describe("Approvals", function () {
        it("Should approve allowances", async function () {
            const approveAmount = ethers.utils.parseEther("500");
            await token.approve(addr1.address, approveAmount);
            expect(await token.allowance(owner.address, addr1.address)).to.equal(approveAmount);
        });

        it("Should fail to approve zero address", async function () {
            const approveAmount = ethers.utils.parseEther("500");
            await expect(
                token.approve(ethers.constants.AddressZero, approveAmount)
            ).to.be.revertedWith("Approve to zero address");
        });

        it("Should emit Approval event", async function () {
            const approveAmount = ethers.utils.parseEther("500");
            await expect(token.approve(addr1.address, approveAmount))
                .to.emit(token, "Approval")
                .withArgs(owner.address, addr1.address, approveAmount);
        });
    });

    // 测试授权转账功能
    describe("TransferFrom", function () {
        it("Should transfer from approved allowances", async function () {
            const transferAmount = ethers.utils.parseEther("200");

            // 授权
            await token.approve(addr1.address, transferAmount);

            // 使用授权转账
            await token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
            expect(await token.balanceOf(addr2.address)).to.equal(transferAmount);
            expect(await token.allowance(owner.address, addr1.address)).to.equal(0);
        });

        it("Should fail if allowance is insufficient", async function () {
            const approveAmount = ethers.utils.parseEther("100");
            await token.approve(addr1.address, approveAmount);

            const transferAmount = ethers.utils.parseEther("200");
            await expect(
                token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
            ).to.be.revertedWith("Allowance exceeded");
        });

        it("Should fail if from balance is insufficient", async function () {
            const approveAmount = ethers.utils.parseEther("1000000");
            await token.approve(addr1.address, approveAmount);

            await expect(
                token.connect(addr1).transferFrom(owner.address, addr2.address, approveAmount)
            ).to.be.revertedWith("Insufficient balance");
        });
    });
});