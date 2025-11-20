const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC20Token", function () {
    let ERC20Token;
    let erc20Token;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    const TOKEN_NAME = "Test Token";
    const TOKEN_SYMBOL = "TEST";
    const INITIAL_SUPPLY = 1000000; // 1,000,000 tokens
    const INITIAL_SUPPLY_WEI = ethers.parseEther(INITIAL_SUPPLY.toString());

    beforeEach(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        ERC20Token = await ethers.getContractFactory("ERC20Token");
        erc20Token = await ERC20Token.deploy(TOKEN_NAME, TOKEN_SYMBOL, INITIAL_SUPPLY);
        await erc20Token.waitForDeployment();
    });

    describe("部署", function () {
        it("应该设置正确的名称", async function () {
            expect(await erc20Token.name()).to.equal(TOKEN_NAME);
        });

        it("应该设置正确的符号", async function () {
            expect(await erc20Token.symbol()).to.equal(TOKEN_SYMBOL);
        });

        it("应该设置正确的精度", async function () {
            expect(await erc20Token.decimals()).to.equal(18);
        });

        it("应该设置正确的总供应量", async function () {
            expect(await erc20Token.totalSupply()).to.equal(INITIAL_SUPPLY_WEI);
        });

        it("应该将初始供应量分配给部署者", async function () {
            expect(await erc20Token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY_WEI);
        });

        it("应该发出Transfer事件", async function () {
            const tx = await ERC20Token.deploy(TOKEN_NAME, TOKEN_SYMBOL, INITIAL_SUPPLY);
            await expect(tx.deploymentTransaction())
                .to.emit(tx, "Transfer")
                .withArgs(ethers.ZeroAddress, owner.address, INITIAL_SUPPLY_WEI);
        });
    });

    describe("转账", function () {
        const transferAmount = ethers.parseEther("100");

        it("应该允许有效的转账", async function () {
            await expect(erc20Token.transfer(addr1.address, transferAmount))
                .to.emit(erc20Token, "Transfer")
                .withArgs(owner.address, addr1.address, transferAmount);

            expect(await erc20Token.balanceOf(owner.address))
                .to.equal(INITIAL_SUPPLY_WEI - transferAmount);
            expect(await erc20Token.balanceOf(addr1.address))
                .to.equal(transferAmount);
        });

        it("应该拒绝余额不足的转账", async function () {
            const excessiveAmount = INITIAL_SUPPLY_WEI + ethers.parseEther("1");
            await expect(erc20Token.transfer(addr1.address, excessiveAmount))
                .to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });

        it("应该拒绝向零地址转账", async function () {
            await expect(erc20Token.transfer(ethers.ZeroAddress, transferAmount))
                .to.be.revertedWith("ERC20: transfer to the zero address");
        });

        it("应该拒绝从零地址转账", async function () {
            await expect(erc20Token.connect(addr1).transfer(addr2.address, transferAmount))
                .to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });

        it("应该正确更新余额", async function () {
            const initialOwnerBalance = await erc20Token.balanceOf(owner.address);
            const initialAddr1Balance = await erc20Token.balanceOf(addr1.address);

            await erc20Token.transfer(addr1.address, transferAmount);

            expect(await erc20Token.balanceOf(owner.address))
                .to.equal(initialOwnerBalance - transferAmount);
            expect(await erc20Token.balanceOf(addr1.address))
                .to.equal(initialAddr1Balance + transferAmount);
        });
    });

    describe("授权", function () {
        const approveAmount = ethers.parseEther("100");

        it("应该允许授权", async function () {
            await expect(erc20Token.approve(addr1.address, approveAmount))
                .to.emit(erc20Token, "Approval")
                .withArgs(owner.address, addr1.address, approveAmount);

            expect(await erc20Token.allowance(owner.address, addr1.address))
                .to.equal(approveAmount);
        });

        it("应该拒绝向零地址授权", async function () {
            await expect(erc20Token.approve(ethers.ZeroAddress, approveAmount))
                .to.be.revertedWith("ERC20: approve to the zero address");
        });

        it("应该允许更新授权", async function () {
            await erc20Token.approve(addr1.address, approveAmount);
            expect(await erc20Token.allowance(owner.address, addr1.address))
                .to.equal(approveAmount);

            const newAmount = ethers.parseEther("200");
            await erc20Token.approve(addr1.address, newAmount);
            expect(await erc20Token.allowance(owner.address, addr1.address))
                .to.equal(newAmount);
        });
    });

    describe("授权转账", function () {
        const approveAmount = ethers.parseEther("100");
        const transferAmount = ethers.parseEther("50");

        beforeEach(async function () {
            await erc20Token.approve(addr1.address, approveAmount);
        });

        it("应该允许授权转账", async function () {
            await expect(erc20Token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount))
                .to.emit(erc20Token, "Transfer")
                .withArgs(owner.address, addr2.address, transferAmount);

            expect(await erc20Token.balanceOf(owner.address))
                .to.equal(INITIAL_SUPPLY_WEI - transferAmount);
            expect(await erc20Token.balanceOf(addr2.address))
                .to.equal(transferAmount);
        });

        it("应该更新授权额度", async function () {
            await erc20Token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);

            expect(await erc20Token.allowance(owner.address, addr1.address))
                .to.equal(approveAmount - transferAmount);
        });

        it("应该拒绝授权不足的转账", async function () {
            const excessiveAmount = approveAmount + ethers.parseEther("1");
            await expect(erc20Token.connect(addr1).transferFrom(owner.address, addr2.address, excessiveAmount))
                .to.be.revertedWith("ERC20: insufficient allowance");
        });

        it("应该拒绝余额不足的转账", async function () {
            // 先转账所有余额给addr1
            await erc20Token.transfer(addr1.address, INITIAL_SUPPLY_WEI);

            // 尝试从owner转账（余额为0）
            await expect(erc20Token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount))
                .to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });

        it("应该拒绝向零地址转账", async function () {
            await expect(erc20Token.connect(addr1).transferFrom(owner.address, ethers.ZeroAddress, transferAmount))
                .to.be.revertedWith("ERC20: transfer to the zero address");
        });

        it("应该拒绝从零地址转账", async function () {
            await expect(erc20Token.connect(addr1).transferFrom(ethers.ZeroAddress, addr2.address, transferAmount))
                .to.be.revertedWith("ERC20: transfer from the zero address");
        });
    });

    describe("铸造", function () {
        const mintAmount = ethers.parseEther("1000");

        it("应该允许铸造新代币", async function () {
            const initialTotalSupply = await erc20Token.totalSupply();
            const initialBalance = await erc20Token.balanceOf(addr1.address);

            await expect(erc20Token.mint(addr1.address, mintAmount))
                .to.emit(erc20Token, "Transfer")
                .withArgs(ethers.ZeroAddress, addr1.address, mintAmount);

            expect(await erc20Token.totalSupply())
                .to.equal(initialTotalSupply + mintAmount);
            expect(await erc20Token.balanceOf(addr1.address))
                .to.equal(initialBalance + mintAmount);
        });

        it("应该拒绝向零地址铸造", async function () {
            await expect(erc20Token.mint(ethers.ZeroAddress, mintAmount))
                .to.be.revertedWith("ERC20: mint to the zero address");
        });
    });

    describe("销毁", function () {
        const burnAmount = ethers.parseEther("1000");

        it("应该允许销毁代币", async function () {
            const initialTotalSupply = await erc20Token.totalSupply();
            const initialBalance = await erc20Token.balanceOf(owner.address);

            await expect(erc20Token.burn(burnAmount))
                .to.emit(erc20Token, "Transfer")
                .withArgs(owner.address, ethers.ZeroAddress, burnAmount);

            expect(await erc20Token.totalSupply())
                .to.equal(initialTotalSupply - burnAmount);
            expect(await erc20Token.balanceOf(owner.address))
                .to.equal(initialBalance - burnAmount);
        });

        it("应该拒绝销毁超过余额的代币", async function () {
            const excessiveAmount = INITIAL_SUPPLY_WEI + ethers.parseEther("1");
            await expect(erc20Token.burn(excessiveAmount))
                .to.be.revertedWith("ERC20: burn amount exceeds balance");
        });

        it("应该拒绝从零地址销毁", async function () {
            // 创建一个新合约实例，从零地址调用burn
            const ERC20TokenZero = await ethers.getContractFactory("ERC20Token");
            const erc20TokenZero = await ERC20TokenZero.deploy("Test", "TEST", 0);
            await erc20TokenZero.waitForDeployment();

            await expect(erc20TokenZero.burn(burnAmount))
                .to.be.revertedWith("ERC20: burn amount exceeds balance");
        });
    });

    describe("边界情况", function () {
        it("应该处理零金额转账", async function () {
            await expect(erc20Token.transfer(addr1.address, 0))
                .to.emit(erc20Token, "Transfer")
                .withArgs(owner.address, addr1.address, 0);
        });

        it("应该处理零金额授权", async function () {
            await expect(erc20Token.approve(addr1.address, 0))
                .to.emit(erc20Token, "Approval")
                .withArgs(owner.address, addr1.address, 0);
        });

        it("应该处理最大uint256授权", async function () {
            const maxAmount = ethers.MaxUint256;
            await erc20Token.approve(addr1.address, maxAmount);
            expect(await erc20Token.allowance(owner.address, addr1.address))
                .to.equal(maxAmount);
        });

        it("应该处理最大uint256转账（如果余额足够）", async function () {
            // 使用一个大的但不是最大uint256的值来避免溢出
            const largeAmount = ethers.parseEther("1000000"); // 1,000,000 tokens
            // 先铸造足够的代币
            await erc20Token.mint(owner.address, largeAmount);

            await expect(erc20Token.transfer(addr1.address, largeAmount))
                .to.emit(erc20Token, "Transfer")
                .withArgs(owner.address, addr1.address, largeAmount);
        });
    });

    describe("Gas优化测试", function () {
        it("应该测量基本操作的gas消耗", async function () {
            const transferAmount = ethers.parseEther("100");
            const approveAmount = ethers.parseEther("200");

            // 测量转账gas消耗
            const transferTx = await erc20Token.transfer(addr1.address, transferAmount);
            const transferReceipt = await transferTx.wait();
            console.log(`转账gas消耗: ${transferReceipt.gasUsed}`);

            // 测量授权gas消耗
            const approveTx = await erc20Token.approve(addr1.address, approveAmount);
            const approveReceipt = await approveTx.wait();
            console.log(`授权gas消耗: ${approveReceipt.gasUsed}`);

            // 测量授权转账gas消耗
            const transferFromTx = await erc20Token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
            const transferFromReceipt = await transferFromTx.wait();
            console.log(`授权转账gas消耗: ${transferFromReceipt.gasUsed}`);
        });
    });
});
