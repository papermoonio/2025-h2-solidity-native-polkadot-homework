import { expect } from "chai";
import { network } from "hardhat";
import type { BaseContract, ContractFactory } from "ethers";

const { ethers } = await network.connect();

// 定义合约类型
type MyERC20Contract = BaseContract & {
    name(): Promise<string>;
    symbol(): Promise<string>;
    decimals(): Promise<number>;
    totalSupply(): Promise<bigint>;
    balanceOf(account: string): Promise<bigint>;
    allowance(owner: string, spender: string): Promise<bigint>;
    owner(): Promise<string>;
    transfer(to: string, value: bigint): Promise<any>;
    transferFrom(from: string, to: string, value: bigint): Promise<any>;
    approve(spender: string, value: bigint): Promise<any>;
    increaseAllowance(spender: string, addedValue: bigint): Promise<any>;
    decreaseAllowance(spender: string, subtractedValue: bigint): Promise<any>;
    mint(to: string, value: bigint): Promise<any>;
    burn(value: bigint): Promise<any>;
    transferOwnership(newOwner: string): Promise<any>;
    connect(signer: any): MyERC20Contract;
    waitForDeployment(): Promise<MyERC20Contract>;
};

describe("MyERC20 合约测试", function () {
    let myERC20: MyERC20Contract;
    let owner: any;
    let addr1: any;
    let addr2: any;
    let addr3: any;

    // 代币参数
    const TOKEN_NAME = "My Custom Token";
    const TOKEN_SYMBOL = "MCT";
    const DECIMALS = 18;
    const INITIAL_SUPPLY = 1000000; // 1,000,000 tokens

    beforeEach(async function () {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        // 部署合约
        const MyERC20Factory: ContractFactory = await ethers.getContractFactory("MyERC20");
        myERC20 = await MyERC20Factory.deploy(TOKEN_NAME, TOKEN_SYMBOL, DECIMALS, INITIAL_SUPPLY) as MyERC20Contract;
        await myERC20.waitForDeployment();
    });

    describe("部署和基本信息", function () {
        it("应该正确设置代币名称", async function () {
            expect(await myERC20.name()).to.equal(TOKEN_NAME);
        });

        it("应该正确设置代币符号", async function () {
            expect(await myERC20.symbol()).to.equal(TOKEN_SYMBOL);
        });

        it("应该正确设置小数位数", async function () {
            expect(await myERC20.decimals()).to.equal(DECIMALS);
        });

        it("应该正确设置总供应量", async function () {
            const expectedTotalSupply = BigInt(INITIAL_SUPPLY) * (10n ** BigInt(DECIMALS));
            expect(await myERC20.totalSupply()).to.equal(expectedTotalSupply);
        });

        it("应该将所有初始代币分配给部署者", async function () {
            const expectedBalance = BigInt(INITIAL_SUPPLY) * (10n ** BigInt(DECIMALS));
            expect(await myERC20.balanceOf(owner.address)).to.equal(expectedBalance);
        });

        it("应该设置正确的所有者", async function () {
            expect(await myERC20.owner()).to.equal(owner.address);
        });
    });

    describe("Transfer 功能", function () {
        const transferAmount = ethers.parseUnits("100", DECIMALS);

        it("应该成功转账", async function () {
            await expect(myERC20.transfer(addr1.address, transferAmount))
                .to.emit(myERC20, "Transfer")
                .withArgs(owner.address, addr1.address, transferAmount);

            expect(await myERC20.balanceOf(addr1.address)).to.equal(transferAmount);
        });

        it("转账后发送者余额应该减少", async function () {
            const initialBalance = await myERC20.balanceOf(owner.address);
            await myERC20.transfer(addr1.address, transferAmount);

            const finalBalance = await myERC20.balanceOf(owner.address);
            expect(finalBalance).to.equal(initialBalance - transferAmount);
        });

        it("余额不足时转账应该失败", async function () {
            const largeAmount = ethers.parseUnits("2000000", DECIMALS); // 超过总供应量

            await expect(myERC20.transfer(addr1.address, largeAmount))
                .to.be.revertedWith("Insufficient balance");
        });

        it("转账到零地址应该失败", async function () {
            await expect(myERC20.transfer(ethers.ZeroAddress, transferAmount))
                .to.be.revertedWith("Transfer to zero address");
        });
    });

    describe("Approve 和 Allowance 功能", function () {
        const approveAmount = ethers.parseUnits("500", DECIMALS);

        it("应该成功授权", async function () {
            await expect(myERC20.approve(addr1.address, approveAmount))
                .to.emit(myERC20, "Approval")
                .withArgs(owner.address, addr1.address, approveAmount);

            expect(await myERC20.allowance(owner.address, addr1.address)).to.equal(approveAmount);
        });

        it("授权到零地址应该失败", async function () {
            await expect(myERC20.approve(ethers.ZeroAddress, approveAmount))
                .to.be.revertedWith("Approve to zero address");
        });

        it("应该能够增加授权额度", async function () {
            await myERC20.approve(addr1.address, approveAmount);
            const additionalAmount = ethers.parseUnits("200", DECIMALS);

            await expect(myERC20.increaseAllowance(addr1.address, additionalAmount))
                .to.emit(myERC20, "Approval")
                .withArgs(owner.address, addr1.address, approveAmount + additionalAmount);

            expect(await myERC20.allowance(owner.address, addr1.address))
                .to.equal(approveAmount + additionalAmount);
        });

        it("应该能够减少授权额度", async function () {
            await myERC20.approve(addr1.address, approveAmount);
            const decreaseAmount = ethers.parseUnits("100", DECIMALS);

            await expect(myERC20.decreaseAllowance(addr1.address, decreaseAmount))
                .to.emit(myERC20, "Approval")
                .withArgs(owner.address, addr1.address, approveAmount - decreaseAmount);

            expect(await myERC20.allowance(owner.address, addr1.address))
                .to.equal(approveAmount - decreaseAmount);
        });

        it("减少授权额度超过当前额度应该失败", async function () {
            await myERC20.approve(addr1.address, approveAmount);
            const largeDecrease = ethers.parseUnits("600", DECIMALS);

            await expect(myERC20.decreaseAllowance(addr1.address, largeDecrease))
                .to.be.revertedWith("Decreased allowance below zero");
        });
    });

    describe("TransferFrom 功能", function () {
        const approveAmount = ethers.parseUnits("500", DECIMALS);
        const transferAmount = ethers.parseUnits("200", DECIMALS);

        beforeEach(async function () {
            // 先授权
            await myERC20.approve(addr1.address, approveAmount);
        });

        it("应该成功执行授权转账", async function () {
            await expect(myERC20.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount))
                .to.emit(myERC20, "Transfer")
                .withArgs(owner.address, addr2.address, transferAmount);

            expect(await myERC20.balanceOf(addr2.address)).to.equal(transferAmount);
            expect(await myERC20.allowance(owner.address, addr1.address))
                .to.equal(approveAmount - transferAmount);
        });

        it("授权额度不足时应该失败", async function () {
            const largeAmount = ethers.parseUnits("600", DECIMALS);

            await expect(myERC20.connect(addr1).transferFrom(owner.address, addr2.address, largeAmount))
                .to.be.revertedWith("Insufficient allowance");
        });

        it("余额不足时应该失败", async function () {
            // 先转走几乎所有代币，只留下少于转账金额的余额
            const ownerBalance = await myERC20.balanceOf(owner.address);
            const leaveAmount = ethers.parseUnits("100", DECIMALS); // 留下100个代币
            const transferAwayAmount = ownerBalance - leaveAmount;
            await myERC20.transfer(addr3.address, transferAwayAmount);

            // 现在尝试转账200个代币，但只有100个余额
            await expect(myERC20.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount))
                .to.be.revertedWith("Insufficient balance");
        });

        it("转账到零地址应该失败", async function () {
            await expect(myERC20.connect(addr1).transferFrom(owner.address, ethers.ZeroAddress, transferAmount))
                .to.be.revertedWith("Transfer to zero address");
        });
    });

    describe("Mint 功能", function () {
        const mintAmount = ethers.parseUnits("1000", DECIMALS);

        it("所有者应该能够铸币", async function () {
            const initialTotalSupply = await myERC20.totalSupply();
            const initialBalance = await myERC20.balanceOf(addr1.address);

            await expect(myERC20.mint(addr1.address, mintAmount))
                .to.emit(myERC20, "Transfer")
                .withArgs(ethers.ZeroAddress, addr1.address, mintAmount);

            expect(await myERC20.totalSupply()).to.equal(initialTotalSupply + mintAmount);
            expect(await myERC20.balanceOf(addr1.address)).to.equal(initialBalance + mintAmount);
        });

        it("非所有者不能铸币", async function () {
            await expect(myERC20.connect(addr1).mint(addr2.address, mintAmount))
                .to.be.revertedWith("Not the owner");
        });

        it("铸币到零地址应该失败", async function () {
            await expect(myERC20.mint(ethers.ZeroAddress, mintAmount))
                .to.be.revertedWith("Mint to zero address");
        });
    });

    describe("Burn 功能", function () {
        const burnAmount = ethers.parseUnits("1000", DECIMALS);

        it("所有者应该能够销毁代币", async function () {
            const initialTotalSupply = await myERC20.totalSupply();
            const initialBalance = await myERC20.balanceOf(owner.address);

            await expect(myERC20.burn(burnAmount))
                .to.emit(myERC20, "Transfer")
                .withArgs(owner.address, ethers.ZeroAddress, burnAmount);

            expect(await myERC20.totalSupply()).to.equal(initialTotalSupply - burnAmount);
            expect(await myERC20.balanceOf(owner.address)).to.equal(initialBalance - burnAmount);
        });

        it("非所有者不能销毁代币", async function () {
            await expect(myERC20.connect(addr1).burn(burnAmount))
                .to.be.revertedWith("Not the owner");
        });

        it("余额不足时不能销毁", async function () {
            const largeAmount = ethers.parseUnits("2000000", DECIMALS);

            await expect(myERC20.burn(largeAmount))
                .to.be.revertedWith("Insufficient balance to burn");
        });
    });

    describe("所有权转移", function () {
        it("所有者应该能够转移所有权", async function () {
            await myERC20.transferOwnership(addr1.address);
            expect(await myERC20.owner()).to.equal(addr1.address);
        });

        it("非所有者不能转移所有权", async function () {
            await expect(myERC20.connect(addr1).transferOwnership(addr2.address))
                .to.be.revertedWith("Not the owner");
        });

        it("不能转移所有权到零地址", async function () {
            await expect(myERC20.transferOwnership(ethers.ZeroAddress))
                .to.be.revertedWith("New owner is zero address");
        });

        it("新所有者应该能够铸币", async function () {
            await myERC20.transferOwnership(addr1.address);
            const mintAmount = ethers.parseUnits("500", DECIMALS);

            await expect(myERC20.connect(addr1).mint(addr2.address, mintAmount))
                .to.emit(myERC20, "Transfer")
                .withArgs(ethers.ZeroAddress, addr2.address, mintAmount);
        });
    });
});