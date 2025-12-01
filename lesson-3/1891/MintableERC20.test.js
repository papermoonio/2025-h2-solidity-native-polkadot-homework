const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MintableERC20", function() {
    let MintableERC20;
    let token;
    let owner;
    let addr1;
    let addr2;
    const name = "MintableToken";
    const symbol = "MINT";
    const decimals = 18;
    const initialSupply = 1000;

    beforeEach(async function() {
        // 部署合约前的准备
        [owner, addr1, addr2] = await ethers.getSigners();
        MintableERC20 = await ethers.getContractFactory("MintableERC20");
        token = await MintableERC20.deploy(name, symbol, decimals, initialSupply);
        await token.deployed();
    });

    // 测试元数据
    describe("Metadata", function() {
        it("Should have correct name", async function() {
            expect(await token.name()).to.equal(name);
        });

        it("Should have correct symbol", async function() {
            expect(await token.symbol()).to.equal(symbol);
        });

        it("Should have correct decimals", async function() {
            expect(await token.decimals()).to.equal(decimals);
        });

        it("Should have correct owner", async function() {
            expect(await token.owner()).to.equal(owner.address);
        });
    });

    // 测试供应和余额
    describe("Supply and Balances", function() {
        it("Should set total supply correctly", async function() {
            const expectedSupply = ethers.BigNumber.from(initialSupply).mul(
                ethers.BigNumber.from(10).pow(decimals)
            );
            expect(await token.totalSupply()).to.equal(expectedSupply);
        });

        it("Should set owner balance correctly", async function() {
            const expectedSupply = ethers.BigNumber.from(initialSupply).mul(
                ethers.BigNumber.from(10).pow(decimals)
            );
            expect(await token.balanceOf(owner.address)).to.equal(expectedSupply);
        });

        it("Should initialize with zero supply when initialSupply is 0", async function() {
            const token2 = await MintableERC20.deploy(name, symbol, decimals, 0);
            await token2.deployed();
            expect(await token2.totalSupply()).to.equal(0);
            expect(await token2.balanceOf(owner.address)).to.equal(0);
        });
    });

    // 测试转账功能
    describe("Transfers", function() {
        it("Should transfer tokens between accounts", async function() {
            const transferAmount = ethers.utils.parseEther("100");

            // 转账
            await token.transfer(addr1.address, transferAmount);
            expect(await token.balanceOf(addr1.address)).to.equal(transferAmount);

            // 二次转账
            await token.connect(addr1).transfer(addr2.address, transferAmount.div(2));
            expect(await token.balanceOf(addr2.address)).to.equal(transferAmount.div(2));
            expect(await token.balanceOf(addr1.address)).to.equal(transferAmount.div(2));
        });

        it("Should fail if sender has insufficient balance", async function() {
            const largeAmount = ethers.utils.parseEther("1000000");
            await expect(
                token.connect(addr1).transfer(owner.address, largeAmount)
            ).to.be.revertedWith("Insufficient balance");
        });

        it("Should fail to transfer to zero address", async function() {
            const transferAmount = ethers.utils.parseEther("100");
            await expect(
                token.transfer(ethers.constants.AddressZero, transferAmount)
            ).to.be.revertedWith("Transfer to zero address");
        });

        it("Should emit Transfer event", async function() {
            const transferAmount = ethers.utils.parseEther("100");
            await expect(token.transfer(addr1.address, transferAmount))
                .to.emit(token, "Transfer")
                .withArgs(owner.address, addr1.address, transferAmount);
        });
    });

    // 测试授权功能
    describe("Approvals", function() {
        it("Should approve allowances", async function() {
            const approveAmount = ethers.utils.parseEther("500");
            await token.approve(addr1.address, approveAmount);
            expect(await token.allowance(owner.address, addr1.address)).to.equal(approveAmount);
        });

        it("Should fail to approve zero address", async function() {
            const approveAmount = ethers.utils.parseEther("500");
            await expect(
                token.approve(ethers.constants.AddressZero, approveAmount)
            ).to.be.revertedWith("Approve to zero address");
        });

        it("Should emit Approval event", async function() {
            const approveAmount = ethers.utils.parseEther("500");
            await expect(token.approve(addr1.address, approveAmount))
                .to.emit(token, "Approval")
                .withArgs(owner.address, addr1.address, approveAmount);
        });
    });

    // 测试授权转账功能
    describe("TransferFrom", function() {
        it("Should transfer from approved allowances", async function() {
            const transferAmount = ethers.utils.parseEther("200");

            // 授权
            await token.approve(addr1.address, transferAmount);

            // 使用授权转账
            await token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
            expect(await token.balanceOf(addr2.address)).to.equal(transferAmount);
            expect(await token.allowance(owner.address, addr1.address)).to.equal(0);
        });

        it("Should fail if allowance is insufficient", async function() {
            const approveAmount = ethers.utils.parseEther("100");
            await token.approve(addr1.address, approveAmount);

            const transferAmount = ethers.utils.parseEther("200");
            await expect(
                token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
            ).to.be.revertedWith("Allowance exceeded");
        });

        it("Should fail if from balance is insufficient", async function() {
            const approveAmount = ethers.utils.parseEther("1000000");
            await token.approve(addr1.address, approveAmount);

            await expect(
                token.connect(addr1).transferFrom(owner.address, addr2.address, approveAmount)
            ).to.be.revertedWith("Insufficient balance");
        });

        it("Should emit Transfer event on transferFrom", async function() {
            const transferAmount = ethers.utils.parseEther("200");
            await token.approve(addr1.address, transferAmount);

            await expect(
                    token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
                )
                .to.emit(token, "Transfer")
                .withArgs(owner.address, addr2.address, transferAmount);
        });
    });

    // 测试Mint功能
    describe("Mint", function() {
        it("Should mint tokens to specified address", async function() {
            const mintAmount = ethers.utils.parseEther("500");
            const initialSupplyBN = ethers.BigNumber.from(initialSupply).mul(
                ethers.BigNumber.from(10).pow(decimals)
            );

            await token.mint(addr1.address, mintAmount);
            expect(await token.balanceOf(addr1.address)).to.equal(mintAmount);
            expect(await token.totalSupply()).to.equal(initialSupplyBN.add(mintAmount));
        });

        it("Should fail if non-owner tries to mint", async function() {
            const mintAmount = ethers.utils.parseEther("500");
            await expect(
                token.connect(addr1).mint(addr2.address, mintAmount)
            ).to.be.revertedWith("Only owner can call this function");
        });

        it("Should fail to mint to zero address", async function() {
            const mintAmount = ethers.utils.parseEther("500");
            await expect(
                token.mint(ethers.constants.AddressZero, mintAmount)
            ).to.be.revertedWith("Mint to zero address");
        });

        it("Should fail to mint zero amount", async function() {
            await expect(
                token.mint(addr1.address, 0)
            ).to.be.revertedWith("Mint amount must be greater than 0");
        });

        it("Should emit Mint event", async function() {
            const mintAmount = ethers.utils.parseEther("500");
            await expect(token.mint(addr1.address, mintAmount))
                .to.emit(token, "Mint")
                .withArgs(addr1.address, mintAmount);
        });

        it("Should emit Transfer event on mint", async function() {
            const mintAmount = ethers.utils.parseEther("500");
            await expect(token.mint(addr1.address, mintAmount))
                .to.emit(token, "Transfer")
                .withArgs(ethers.constants.AddressZero, addr1.address, mintAmount);
        });

        it("Should allow multiple mints", async function() {
            const mintAmount1 = ethers.utils.parseEther("100");
            const mintAmount2 = ethers.utils.parseEther("200");
            const initialSupplyBN = ethers.BigNumber.from(initialSupply).mul(
                ethers.BigNumber.from(10).pow(decimals)
            );

            await token.mint(addr1.address, mintAmount1);
            await token.mint(addr1.address, mintAmount2);

            expect(await token.balanceOf(addr1.address)).to.equal(mintAmount1.add(mintAmount2));
            expect(await token.totalSupply()).to.equal(initialSupplyBN.add(mintAmount1).add(mintAmount2));
        });
    });

    // 测试Burn功能
    describe("Burn", function() {
        it("Should burn tokens from caller", async function() {
            const transferAmount = ethers.utils.parseEther("100");
            const burnAmount = ethers.utils.parseEther("50");
            const initialSupplyBN = ethers.BigNumber.from(initialSupply).mul(
                ethers.BigNumber.from(10).pow(decimals)
            );

            // 先转账给addr1
            await token.transfer(addr1.address, transferAmount);

            // addr1销毁代币
            await token.connect(addr1).burn(burnAmount);

            expect(await token.balanceOf(addr1.address)).to.equal(transferAmount.sub(burnAmount));
            expect(await token.totalSupply()).to.equal(initialSupplyBN.sub(burnAmount));
        });

        it("Should fail to burn zero amount", async function() {
            await expect(
                token.burn(0)
            ).to.be.revertedWith("Burn amount must be greater than 0");
        });

        it("Should fail if balance is insufficient", async function() {
            const burnAmount = ethers.utils.parseEther("1000000");
            await expect(
                token.connect(addr1).burn(burnAmount)
            ).to.be.revertedWith("Insufficient balance to burn");
        });

        it("Should emit Burn event", async function() {
            const transferAmount = ethers.utils.parseEther("100");
            const burnAmount = ethers.utils.parseEther("50");

            await token.transfer(addr1.address, transferAmount);

            await expect(token.connect(addr1).burn(burnAmount))
                .to.emit(token, "Burn")
                .withArgs(addr1.address, burnAmount);
        });

        it("Should emit Transfer event on burn", async function() {
            const transferAmount = ethers.utils.parseEther("100");
            const burnAmount = ethers.utils.parseEther("50");

            await token.transfer(addr1.address, transferAmount);

            await expect(token.connect(addr1).burn(burnAmount))
                .to.emit(token, "Transfer")
                .withArgs(addr1.address, ethers.constants.AddressZero, burnAmount);
        });

        it("Should allow multiple burns", async function() {
            const transferAmount = ethers.utils.parseEther("300");
            const burnAmount1 = ethers.utils.parseEther("50");
            const burnAmount2 = ethers.utils.parseEther("75");
            const initialSupplyBN = ethers.BigNumber.from(initialSupply).mul(
                ethers.BigNumber.from(10).pow(decimals)
            );

            await token.transfer(addr1.address, transferAmount);

            await token.connect(addr1).burn(burnAmount1);
            await token.connect(addr1).burn(burnAmount2);

            expect(await token.balanceOf(addr1.address)).to.equal(
                transferAmount.sub(burnAmount1).sub(burnAmount2)
            );
            expect(await token.totalSupply()).to.equal(
                initialSupplyBN.sub(burnAmount1).sub(burnAmount2)
            );
        });
    });

    // 测试BurnFrom功能
    describe("BurnFrom", function() {
        it("Should burn tokens from approved account", async function() {
            const transferAmount = ethers.utils.parseEther("200");
            const burnAmount = ethers.utils.parseEther("100");
            const initialSupplyBN = ethers.BigNumber.from(initialSupply).mul(
                ethers.BigNumber.from(10).pow(decimals)
            );

            // 转账给addr1
            await token.transfer(addr1.address, transferAmount);

            // addr1授权给owner销毁代币
            await token.connect(addr1).approve(owner.address, burnAmount);

            // owner销毁addr1的代币
            await token.burnFrom(addr1.address, burnAmount);

            expect(await token.balanceOf(addr1.address)).to.equal(transferAmount.sub(burnAmount));
            expect(await token.totalSupply()).to.equal(initialSupplyBN.sub(burnAmount));
        });

        it("Should fail to burn from zero address", async function() {
            const burnAmount = ethers.utils.parseEther("100");
            await expect(
                token.burnFrom(ethers.constants.AddressZero, burnAmount)
            ).to.be.revertedWith("Burn from zero address");
        });

        it("Should fail to burn zero amount", async function() {
            const transferAmount = ethers.utils.parseEther("100");
            await token.transfer(addr1.address, transferAmount);

            await expect(
                token.burnFrom(addr1.address, 0)
            ).to.be.revertedWith("Burn amount must be greater than 0");
        });

        it("Should fail if balance is insufficient", async function() {
            const burnAmount = ethers.utils.parseEther("1000000");
            await token.approve(owner.address, burnAmount);

            await expect(
                token.burnFrom(addr1.address, burnAmount)
            ).to.be.revertedWith("Insufficient balance to burn");
        });

        it("Should fail if allowance is insufficient", async function() {
            const transferAmount = ethers.utils.parseEther("200");
            const burnAmount = ethers.utils.parseEther("150");
            const approveAmount = ethers.utils.parseEther("100");

            await token.transfer(addr1.address, transferAmount);
            await token.connect(addr1).approve(owner.address, approveAmount);

            await expect(
                token.burnFrom(addr1.address, burnAmount)
            ).to.be.revertedWith("Allowance exceeded");
        });

        it("Should emit Burn event", async function() {
            const transferAmount = ethers.utils.parseEther("200");
            const burnAmount = ethers.utils.parseEther("100");

            await token.transfer(addr1.address, transferAmount);
            await token.connect(addr1).approve(owner.address, burnAmount);

            await expect(token.burnFrom(addr1.address, burnAmount))
                .to.emit(token, "Burn")
                .withArgs(addr1.address, burnAmount);
        });

        it("Should emit Transfer event on burnFrom", async function() {
            const transferAmount = ethers.utils.parseEther("200");
            const burnAmount = ethers.utils.parseEther("100");

            await token.transfer(addr1.address, transferAmount);
            await token.connect(addr1).approve(owner.address, burnAmount);

            await expect(token.burnFrom(addr1.address, burnAmount))
                .to.emit(token, "Transfer")
                .withArgs(addr1.address, ethers.constants.AddressZero, burnAmount);
        });

        it("Should reduce allowance after burnFrom", async function() {
            const transferAmount = ethers.utils.parseEther("200");
            const burnAmount = ethers.utils.parseEther("100");

            await token.transfer(addr1.address, transferAmount);
            await token.connect(addr1).approve(owner.address, burnAmount);

            await token.burnFrom(addr1.address, burnAmount);

            expect(await token.allowance(addr1.address, owner.address)).to.equal(0);
        });
    });

    // 集成测试
    describe("Integration Tests", function() {
        it("Should handle complex mint, transfer, and burn scenarios", async function() {
            const initialSupplyBN = ethers.BigNumber.from(initialSupply).mul(
                ethers.BigNumber.from(10).pow(decimals)
            );

            // 1. Mint新代币
            const mintAmount = ethers.utils.parseEther("500");
            await token.mint(addr1.address, mintAmount);
            expect(await token.totalSupply()).to.equal(initialSupplyBN.add(mintAmount));

            // 2. 转账
            const transferAmount = ethers.utils.parseEther("200");
            await token.connect(addr1).transfer(addr2.address, transferAmount);
            expect(await token.balanceOf(addr2.address)).to.equal(transferAmount);

            // 3. Burn
            const burnAmount = ethers.utils.parseEther("100");
            await token.connect(addr2).burn(burnAmount);
            expect(await token.totalSupply()).to.equal(
                initialSupplyBN.add(mintAmount).sub(burnAmount)
            );

            // 4. 授权和BurnFrom
            const remainingBalance = transferAmount.sub(burnAmount);
            await token.connect(addr2).approve(owner.address, remainingBalance);
            await token.burnFrom(addr2.address, remainingBalance);
            expect(await token.balanceOf(addr2.address)).to.equal(0);
            expect(await token.totalSupply()).to.equal(initialSupplyBN.add(mintAmount).sub(burnAmount).sub(remainingBalance));
        });

        it("Should maintain total supply consistency", async function() {
            const initialSupplyBN = ethers.BigNumber.from(initialSupply).mul(
                ethers.BigNumber.from(10).pow(decimals)
            );

            // 记录初始总供应量
            let expectedTotalSupply = initialSupplyBN;
            expect(await token.totalSupply()).to.equal(expectedTotalSupply);

            // Mint
            const mint1 = ethers.utils.parseEther("100");
            await token.mint(addr1.address, mint1);
            expectedTotalSupply = expectedTotalSupply.add(mint1);
            expect(await token.totalSupply()).to.equal(expectedTotalSupply);

            // Burn
            const burn1 = ethers.utils.parseEther("50");
            await token.connect(addr1).burn(burn1);
            expectedTotalSupply = expectedTotalSupply.sub(burn1);
            expect(await token.totalSupply()).to.equal(expectedTotalSupply);

            // 转账不改变总供应量
            const transfer1 = ethers.utils.parseEther("25");
            await token.connect(addr1).transfer(addr2.address, transfer1);
            expect(await token.totalSupply()).to.equal(expectedTotalSupply);
        });
    });
});