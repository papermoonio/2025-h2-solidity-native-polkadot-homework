import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("MyERC20 Token", function () {
    // 代币常量定义
    const TOKEN_NAME = "MyERC20";
    const TOKEN_SYMBOL = "MTK";
    const TOKEN_DECIMALS = 18;
    const INITIAL_SUPPLY = ethers.parseUnits("10000", TOKEN_DECIMALS); // 初始供应量为 10000 MTK

    let token: any;
    let owner: any;
    let addr1: any;
    let addr2: any;
    
    // 在每个测试之前部署合约，并初始化一些变量
    beforeEach(async function () {
        // 获取测试账户
        [owner,addr1,addr2] = await ethers.getSigners(); // 获取所有参与测试的地址
    
        // 为每个测试部署一个新的MyERC20合约
        token = await ethers.deployContract("MyERC20", [
            TOKEN_NAME,
            TOKEN_SYMBOL,
            TOKEN_DECIMALS,
            INITIAL_SUPPLY
        ]);

        await token.waitForDeployment();
    });

    // 合约部署测试
    describe("Deployment", function () {
        // 检查代币名称是否正确
        it("Should set the correct token name", async function () {
            expect(await token.name()).to.equal(TOKEN_NAME);
        });

        // 检查代币符号是否正确
        it("Should set the correct token symbol", async function () {
            expect(await token.symbol()).to.equal(TOKEN_SYMBOL);
        });

        // 检查小数位数是否正确
        it("Should set the correct decimals", async function () {
            expect(await token.decimals()).to.equal(TOKEN_DECIMALS);
        });
        
        // 检查代币总供应量是否正确分配给部署者
        it("Should assign the total supply to the deployer", async function () {
            const ownerBalance = await token.balanceOf(owner.address);
            expect(await token.totalSupply()).to.equal(ownerBalance);
            expect(ownerBalance).to.equal(INITIAL_SUPPLY);
        });


    });

    // 元数据函数测试
    describe("Metadata Functions", function () {
        it("Should return correct name", async function () {
            expect(await token.name()).to.equal(TOKEN_NAME);
        });

        it("Should return correct symbol", async function () {
            expect(await token.symbol()).to.equal(TOKEN_SYMBOL);
        });

        it("Should return correct decimals", async function () {
            expect(await token.decimals()).to.equal(TOKEN_DECIMALS);
        });

        it("Should return correct total supply", async function () {
            expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
        });
    });

    // 余额查询测试
    describe("balanceOf", function () {
        // 测试账户余额查询功能
        it("Should return the correct balance for an account", async function () {
            expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
            expect(await token.balanceOf(addr1.address)).to.equal(0);
        });

        // 测试从未持有代币的账户余额应为零
        it("Should return zero for accounts that have never held tokens", async function () {
            expect(await token.balanceOf(addr2.address)).to.equal(0);
        });
    });

    // 转账功能测试
    describe("transfer", function () {
        // 测试账户间转账功能
        it("Should transfer tokens between accounts", async function () {
            const transferAmount = ethers.parseUnits("100", TOKEN_DECIMALS);

            await token.transfer(addr1.address, transferAmount);

            expect(await token.balanceOf(addr1.address)).to.equal(transferAmount);
            expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - transferAmount);
        });

        // 测试转账事件是否正确触发
        it("Should emit Transfer event", async function () {
            const transferAmount = ethers.parseUnits("100", TOKEN_DECIMALS);

            await expect(token.transfer(addr1.address, transferAmount))
                .to.emit(token, "Transfer")
                .withArgs(owner.address, addr1.address, transferAmount);
        });

    
        // 测试多次转账后的余额更新
        it("Should update balances correctly after multiple transfers", async function () {
            const amount1 = ethers.parseUnits("100", TOKEN_DECIMALS);
            const amount2 = ethers.parseUnits("50", TOKEN_DECIMALS);

            await token.transfer(addr1.address, amount1);
            await token.transfer(addr2.address, amount2);

            expect(await token.balanceOf(owner.address)).to.equal(
                INITIAL_SUPPLY - amount1 - amount2
            );
            expect(await token.balanceOf(addr1.address)).to.equal(amount1);
            expect(await token.balanceOf(addr2.address)).to.equal(amount2);
        });

        // 测试转账成功返回值
        it("Should return true on successful transfer", async function () {
            const result = await token.transfer.staticCall(addr1.address, 100);
            expect(result).to.equal(true);
        });
    });

    // 授权功能测试
    describe("approve", function () {
        // 测试代币授权功能
        it("Should approve tokens for delegated transfer", async function () {
            const approveAmount = ethers.parseUnits("100", TOKEN_DECIMALS);

            await token.approve(addr1.address, approveAmount);

            expect(await token.allowance(owner.address, addr1.address)).to.equal(approveAmount);
        });

        // 测试授权事件是否正确触发
        it("Should emit Approval event", async function () {
            const approveAmount = ethers.parseUnits("100", TOKEN_DECIMALS);

            await expect(token.approve(addr1.address, approveAmount))
                .to.emit(token, "Approval")
                .withArgs(owner.address, addr1.address, approveAmount);
        });

        // 测试授权金额更新功能
        it("Should allow updating approval amount", async function () {
            const firstApproval = ethers.parseUnits("100", TOKEN_DECIMALS);
            const secondApproval = ethers.parseUnits("200", TOKEN_DECIMALS);
            // 批准 addr1 地址 100 个代币
            await token.approve(addr1.address, firstApproval);
            expect(await token.allowance(owner.address, addr1.address)).to.equal(firstApproval);
            // 更新批准 addr1 地址为 200 个代币
            await token.approve(addr1.address, secondApproval);
            expect(await token.allowance(owner.address, addr1.address)).to.equal(secondApproval);
        });

        // 测试授权成功返回值
        it("Should return true on successful approval", async function () {
            const result = await token.approve.staticCall(addr1.address, 100);
            expect(result).to.equal(true);
        });
    });


    // 授权转账功能测试
    describe("transferFrom", function () {
        // 测试使用授权进行转账
        it("Should transfer tokens ", async function () {
            const approveAmount = ethers.parseUnits("100", TOKEN_DECIMALS);
            const transferAmount = ethers.parseUnits("50", TOKEN_DECIMALS);

            await token.approve(addr1.address, approveAmount);
            await token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);

            expect(await token.balanceOf(addr2.address)).to.equal(transferAmount);
            expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - transferAmount);
          
        });

        // 测试授权转账事件
        it("Should emit Transfer event", async function () {
            const approveAmount = ethers.parseUnits("100", TOKEN_DECIMALS);
            const transferAmount = ethers.parseUnits("50", TOKEN_DECIMALS);

            await token.approve(addr1.address, approveAmount);

            await expect(
                token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
            )
                .to.emit(token, "Transfer")
                .withArgs(owner.address, addr2.address, transferAmount);
        });

        
        // 测试授权转账成功返回值
        it("Should return true on successful transferFrom", async function () {
            await token.approve(addr1.address, 100);
            const result = await token.connect(addr1).transferFrom.staticCall(
                owner.address,
                addr2.address,
                100
            );
            expect(result).to.equal(true);
        });
    });

    // 事件测试
    describe("Events", function () {
        // 测试转账事件的正确参数
        it("Should emit Transfer events with correct parameters", async function () {
            const amount = ethers.parseUnits("100", TOKEN_DECIMALS);

            const tx = await token.transfer(addr1.address, amount);
            const receipt = await tx.wait();

            const transferEvent = receipt.logs.find(
                (log: any) => log.fragment && log.fragment.name === "Transfer"
            );

            expect(transferEvent).to.not.be.undefined;
            expect(transferEvent.args[0]).to.equal(owner.address);
            expect(transferEvent.args[1]).to.equal(addr1.address);
            expect(transferEvent.args[2]).to.equal(amount);
        });

        // 测试授权事件的正确参数
        it("Should emit Approval events with correct parameters", async function () {
            const amount = ethers.parseUnits("100", TOKEN_DECIMALS);

            const tx = await token.approve(addr1.address, amount);
            const receipt = await tx.wait();

            const approvalEvent = receipt.logs.find(
                (log: any) => log.fragment && log.fragment.name === "Approval"
            );

            expect(approvalEvent).to.not.be.undefined;
            expect(approvalEvent.args[0]).to.equal(owner.address);
            expect(approvalEvent.args[1]).to.equal(addr1.address);
            expect(approvalEvent.args[2]).to.equal(amount);
        });
    });
});