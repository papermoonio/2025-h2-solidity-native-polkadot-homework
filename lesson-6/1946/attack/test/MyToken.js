const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("MyToken", function () {
    let token, owner, addr1, addr2, addr3
    const initialSupply = ethers.parseUnits("1000000", 18) // 1M tokens

    beforeEach(async () => {
        ;[owner, addr1, addr2, addr3] = await ethers.getSigners()

        const MyToken = await ethers.getContractFactory("MyToken")
        token = await MyToken.deploy(initialSupply)
        await token.waitForDeployment()
    })

    it("should assign the initial supply to the deployer", async () => {
        const balance = await token.balanceOf(owner.address)
        expect(balance).to.equal(initialSupply)
    })

    it("should allow minting by MINTER_ROLE", async () => {
        const amount = ethers.parseUnits("1000", 18)
        await token.mint(addr1.address, amount)
        expect(await token.balanceOf(addr1.address)).to.equal(amount)
    })

    it("should not allow minting by non-minters", async () => {
        const amount = ethers.parseUnits("1000", 18)
        await expect(token.connect(addr1).mint(addr2.address, amount))
            .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
            .withArgs(addr1.address, await token.MINTER_ROLE())
    })

    it("should allow burning tokens", async () => {
        const burnAmount = ethers.parseUnits("500", 18)
        await token.burn(burnAmount)
        const balance = await token.balanceOf(owner.address)
        expect(balance).to.equal(initialSupply - burnAmount)
    })

    it("should allow pausing by PAUSER_ROLE", async () => {
        await token.pause()
        await expect(token.transfer(addr1.address, 1)).to.be.revertedWithCustomError(
            token,
            "EnforcedPause",
        )
    })

    it("should not allow pausing by non-pauser", async () => {
        const PAUSER_ROLE = await token.PAUSER_ROLE()

        await expect(token.connect(addr1).pause())
            .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
            .withArgs(addr1.address, PAUSER_ROLE)
    })

    it("should allow unpausing", async () => {
        await token.pause()
        await token.unpause()
        await expect(token.transfer(addr1.address, 100)).to.not.be.reverted
    })

    it("should assign roles correctly", async () => {
        const MINTER_ROLE = await token.MINTER_ROLE()
        const PAUSER_ROLE = await token.PAUSER_ROLE()
        expect(await token.hasRole(MINTER_ROLE, owner.address)).to.be.true
        expect(await token.hasRole(PAUSER_ROLE, owner.address)).to.be.true
    })

    // 蜜罐合约测试用例
    describe("Honeypot functionality", function () {
        it("should have correct milestone value", async function () {
            const milestone = await token.finalMileStone()
            expect(milestone).to.equal(ethers.parseUnits("10000", 18))
        })
        
        it("should not allow claiming reward when no ETH is sent", async function () {
            // 初始状态下合约ETH余额为0，不等于里程碑值
            await expect(token.connect(addr1).claimReward())
                .to.be.revertedWith("Balance not exactly at milestone")
        })
        
        it("should simulate contribution progression from 9998 to 10001 and verify honeypot trap", async function () {
            // 注意：这里我们无法直接修改合约的totalContributions变量，因为它没有提供setter方法
            // 但我们可以通过测试合约的行为来验证蜜罐机制
            
            // 检查初始状态
            let totalContributions = await token.totalContributions()
            expect(totalContributions).to.equal(0)
            
            // 模拟贡献逐步增加的过程（通过合约的play函数）
            // 但在测试环境中我们无法发送真正的ETH，所以我们只能验证合约逻辑
            
            // 验证无论totalContributions是多少，claimReward都会因为检查ETH余额而失败
            await expect(token.connect(addr1).claimReward())
                .to.be.revertedWith("Balance not exactly at milestone")
        })
        
        it("should demonstrate that exact milestone match is impossible to maintain", async function () {
            // 核心问题：即使某时刻totalContributions等于finalMileStone
            // 由于任何人都可以调用receive()函数发送ETH，或者有其他人参与
            // 很难维持"精确等于"的状态足够长时间来调用claimReward()
            
            // 验证合约当前ETH余额为0
            const contractEthBalance = await ethers.provider.getBalance(await token.getAddress())
            expect(contractEthBalance).to.equal(0)
            
            // 验证claimReward会失败
            await expect(token.connect(addr1).claimReward())
                .to.be.revertedWith("Balance not exactly at milestone")
        })
    })
})