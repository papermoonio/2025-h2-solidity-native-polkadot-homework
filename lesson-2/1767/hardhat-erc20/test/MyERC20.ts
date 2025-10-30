import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("MyToken 合约", function () {
    let myToken;
    let owner;
    let addr1;
    let addr2;

    const decimals = 18;
    const initialSupply = 1000000n; 
    const initialSupplyWithDecimals = initialSupply * (10n ** BigInt(decimals));

    before(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
    });

    beforeEach(async function () {
        myToken = await ethers.deployContract("MyToken");
    });

    describe("部署", function () {
        it("应该设置正确的名称和符号", async function () {
            expect(await myToken.name()).to.equal("My Awesome Token");
            expect(await myToken.symbol()).to.equal("MAT");
        });

        it("应该将全部初始供应量分配给部署者", async function () {
            const ownerBalance = await myToken.balanceOf(owner.address);
            expect(ownerBalance).to.equal(initialSupplyWithDecimals);

            const totalSupply = await myToken.totalSupply();
            expect(totalSupply).to.equal(initialSupplyWithDecimals);
        });
    });

    describe("交易", function () {
        const transferAmount = ethers.parseUnits("100", decimals);

        it("应该在账户之间转移代币", async function () {
            await expect(myToken.transfer(addr1.address, transferAmount))
                .to.emit(myToken, "Transfer")
                .withArgs(owner.address, addr1.address, transferAmount);

            expect(await myToken.balanceOf(addr1.address)).to.equal(transferAmount);
        });

        it("余额不足时应该失败", async function () {
            const insufficientAmount = initialSupplyWithDecimals + 1n; 

            await expect(
                myToken.transfer(addr1.address, insufficientAmount)
            ).to.be.revertedWithCustomError(myToken, "ERC20InsufficientBalance"); 
        });
    });

    describe("铸币", function () {
        const mintAmount = ethers.parseUnits("500", decimals);

        it("所有者应该能够铸造新的代币", async function () {
            const initialTotalSupply = await myToken.totalSupply();

            await expect(myToken.mint(addr2.address, mintAmount))
                .to.emit(myToken, "Transfer")
                .withArgs(ethers.ZeroAddress, addr2.address, mintAmount); 

            expect(await myToken.totalSupply()).to.equal(initialTotalSupply + mintAmount);
        });

        it("非所有者铸造应该失败", async function () {
            await expect(
                myToken.connect(addr1).mint(addr1.address, mintAmount)
            ).to.be.revertedWithCustomError(myToken, "OwnableUnauthorizedAccount");
        });
    });
});