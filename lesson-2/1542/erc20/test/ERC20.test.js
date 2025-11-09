const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC20", function () {
    let token;
    let owner;
    let addr1;
    let addr2;
    
    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        
        const Token = await ethers.getContractFactory("ERC20");
        token = await Token.deploy("MyToken", "MTK");
        await token.waitForDeployment();
    });
    
    describe("Deployment", function () {
        it("Should set the right name and symbol", async function () {
            expect(await token.name()).to.equal("MyToken");
            expect(await token.symbol()).to.equal("MTK");
        });
        
        it("Should assign the total supply of tokens to the owner", async function () {
            const ownerBalance = await token.balanceOf(owner.address);
            expect(await token.totalSupply()).to.equal(ownerBalance);
        });
    });
    
    describe("Transactions", function () {
        it("Should transfer tokens between accounts", async function () {
            // 转账 50 个代币给 addr1
            await token.transfer(addr1.address, 50);
            const addr1Balance = await token.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(50);
            
            // 从 addr1 转账 50 个代币给 addr2
            await token.connect(addr1).transfer(addr2.address, 50);
            const addr2Balance = await token.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(50);
        });
        
        it("Should fail if sender doesn't have enough tokens", async function () {
            const initialOwnerBalance = await token.balanceOf(owner.address);
            
            // 尝试从 addr1 转账 1 个代币给 owner (addr1 余额为 0)
            await expect(
                token.connect(addr1).transfer(owner.address, 1)
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
            
            // 确认余额没有变化
            expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance);
        });
    });
    
    describe("Allowances", function () {
        it("Should update allowance after approve", async function () {
            await token.approve(addr1.address, 100);
            expect(await token.allowance(owner.address, addr1.address)).to.equal(100);
        });
        
        it("Should transfer tokens using transferFrom", async function () {
            await token.approve(addr1.address, 100);
            
            await token.connect(addr1).transferFrom(owner.address, addr2.address, 100);
            
            expect(await token.balanceOf(addr2.address)).to.equal(100);
            expect(await token.allowance(owner.address, addr1.address)).to.equal(0);
        });
        
        it("Should fail if trying to transferFrom more than allowed", async function () {
            await token.approve(addr1.address, 99);
            
            await expect(
                token.connect(addr1).transferFrom(owner.address, addr2.address, 100)
            ).to.be.revertedWith("ERC20: insufficient allowance");
        });
    });
});