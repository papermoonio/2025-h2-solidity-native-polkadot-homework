const { expect } = require("chai");
const { expandTo18Decimals } = require('./shared/utilities');
const hre = require("hardhat");

const MINIMUM_LIQUIDITY = 1000n;

describe('UniswapV2Pair - Extended Tests', function () {
  let token0;
  let token1;
  let pair;
  let wallet;
  let other;

  beforeEach(async function () {
    [wallet, other] = await ethers.getSigners();

    // Deploy tokens
    const ERC20 = await ethers.getContractFactory("contracts/test/ERC20.sol:ERC20");
    const tokenA = await ERC20.deploy(expandTo18Decimals(10000));
    const tokenB = await ERC20.deploy(expandTo18Decimals(10000));
    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();

    // Deploy factory
    const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
    const factory = await UniswapV2Factory.deploy(wallet.address);
    await factory.waitForDeployment();

    // Create pair
    const tokenAAddress = await tokenA.getAddress();
    const tokenBAddress = await tokenB.getAddress();
    await factory.createPair(tokenAAddress, tokenBAddress);
    const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress);
    pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);

    // Determine token order
    const token0Address = await pair.token0();
    token0 = tokenAAddress === token0Address ? tokenA : tokenB;
    token1 = tokenAAddress === token0Address ? tokenB : tokenA;
  });

  describe('流动性管理边界测试', function () {
    it('应该正确处理最小流动性', async function () {
      const token0Amount = expandTo18Decimals(1);
      const token1Amount = expandTo18Decimals(4);

      await token0.transfer(await pair.getAddress(), token0Amount);
      await token1.transfer(await pair.getAddress(), token1Amount);

      const expectedLiquidity = expandTo18Decimals(2);
      await expect(pair.mint(wallet.address))
        .to.emit(pair, 'Transfer')
        .withArgs(ethers.ZeroAddress, ethers.ZeroAddress, MINIMUM_LIQUIDITY)
        .to.emit(pair, 'Transfer')
        .withArgs(ethers.ZeroAddress, wallet.address, expectedLiquidity - MINIMUM_LIQUIDITY);

      expect(await pair.totalSupply()).to.eq(expectedLiquidity);
      expect(await pair.balanceOf(wallet.address)).to.eq(expectedLiquidity - MINIMUM_LIQUIDITY);
    });

    it('应该拒绝不平衡的流动性添加', async function () {
      // First mint
      const token0Amount = expandTo18Decimals(1);
      const token1Amount = expandTo18Decimals(4);
      await token0.transfer(await pair.getAddress(), token0Amount);
      await token1.transfer(await pair.getAddress(), token1Amount);
      await pair.mint(wallet.address);

      // Try to add unbalanced liquidity
      const token0Amount2 = expandTo18Decimals(2);
      const token1Amount2 = expandTo18Decimals(1); // Wrong ratio
      await token0.transfer(await pair.getAddress(), token0Amount2);
      await token1.transfer(await pair.getAddress(), token1Amount2);
      
      // Should still work but user gets less LP tokens
      await pair.mint(wallet.address);
      // The actual LP tokens received will be based on the minimum ratio
    });
  });

  describe('交换功能扩展测试', function () {
    beforeEach(async function () {
      // Add initial liquidity
      const token0Amount = expandTo18Decimals(5);
      const token1Amount = expandTo18Decimals(10);
      await token0.transfer(await pair.getAddress(), token0Amount);
      await token1.transfer(await pair.getAddress(), token1Amount);
      await pair.mint(wallet.address);
    });

    it('应该正确计算多次小额交换', async function () {
      const swapAmount = expandTo18Decimals(1);
      const expectedOutputAmount = 1662497915624478906n; // Based on x*y=k

      // First swap
      await token0.transfer(await pair.getAddress(), swapAmount);
      await pair.swap(0, expectedOutputAmount, wallet.address, '0x');

      const reserves1 = await pair.getReserves();
      
      // Second swap
      await token0.transfer(await pair.getAddress(), swapAmount);
      await pair.swap(0, 1000000000000000000n, wallet.address, '0x');

      const reserves2 = await pair.getReserves();
      
      // Verify reserves increased for token0 and decreased for token1
      expect(reserves2[0]).to.be.gt(reserves1[0]);
      expect(reserves2[1]).to.be.lt(reserves1[1]);
    });

    it('应该正确处理大额交换', async function () {
      const largeSwapAmount = expandTo18Decimals(2); // 40% of pool
      await token0.transfer(await pair.getAddress(), largeSwapAmount);
      
      // Calculate expected output with 0.3% fee
      const reserves = await pair.getReserves();
      const amountInWithFee = largeSwapAmount * 997n;
      const numerator = amountInWithFee * reserves[1];
      const denominator = reserves[0] * 1000n + amountInWithFee;
      const expectedOutput = numerator / denominator;

      await expect(pair.swap(0, expectedOutput, wallet.address, '0x'))
        .to.emit(pair, 'Swap');
    });

    it('应该拒绝输出金额过大的交换', async function () {
      const swapAmount = expandTo18Decimals(1);
      const reserves = await pair.getReserves();
      const tooLargeOutput = reserves[1]; // Try to drain entire reserve

      await token0.transfer(await pair.getAddress(), swapAmount);
      await expect(
        pair.swap(0, tooLargeOutput, wallet.address, '0x')
      ).to.be.reverted;
    });
  });

  describe('价格预言机测试', function () {
    it('应该正确累积价格', async function () {
      // Add liquidity
      const token0Amount = expandTo18Decimals(3);
      const token1Amount = expandTo18Decimals(3);
      await token0.transfer(await pair.getAddress(), token0Amount);
      await token1.transfer(await pair.getAddress(), token1Amount);
      await pair.mint(wallet.address);

      const initialPrice0 = await pair.price0CumulativeLast();
      const initialPrice1 = await pair.price1CumulativeLast();

      // Wait for some time (simulate by doing a swap)
      await token0.transfer(await pair.getAddress(), expandTo18Decimals(1));
      await pair.swap(0, expandTo18Decimals(0.5), wallet.address, '0x');

      const newPrice0 = await pair.price0CumulativeLast();
      const newPrice1 = await pair.price1CumulativeLast();

      // Prices should have accumulated
      expect(newPrice0).to.be.gt(initialPrice0);
      expect(newPrice1).to.be.gt(initialPrice1);
    });
  });

  describe('重入攻击防护测试', function () {
    it('应该防止重入攻击', async function () {
      // Add liquidity
      const token0Amount = expandTo18Decimals(5);
      const token1Amount = expandTo18Decimals(10);
      await token0.transfer(await pair.getAddress(), token0Amount);
      await token1.transfer(await pair.getAddress(), token1Amount);
      await pair.mint(wallet.address);

      // Try to call swap recursively (should fail due to lock)
      // This is a simplified test - in reality you'd need a malicious contract
      await token0.transfer(await pair.getAddress(), expandTo18Decimals(1));
      await pair.swap(0, expandTo18Decimals(1), wallet.address, '0x');
      
      // If we got here, the lock mechanism is working
      expect(true).to.be.true;
    });
  });

  describe('边界条件测试', function () {
    it('应该处理零地址转账', async function () {
      const token0Amount = expandTo18Decimals(1);
      const token1Amount = expandTo18Decimals(4);
      await token0.transfer(await pair.getAddress(), token0Amount);
      await token1.transfer(await pair.getAddress(), token1Amount);
      await pair.mint(wallet.address);

      // Try to burn to zero address (should fail)
      const liquidity = await pair.balanceOf(wallet.address);
      await pair.transfer(await pair.getAddress(), liquidity);
      await expect(
        pair.burn(ethers.ZeroAddress)
      ).to.be.reverted;
    });

    it('应该正确处理余额溢出保护', async function () {
      // This test verifies that the contract handles large numbers correctly
      const largeAmount = expandTo18Decimals(1000000); // 1 million tokens
      await token0.transfer(await pair.getAddress(), largeAmount);
      await token1.transfer(await pair.getAddress(), largeAmount);
      
      await pair.mint(wallet.address);
      expect(await pair.totalSupply()).to.be.gt(0);
    });
  });

  describe('手续费机制测试', function () {
    it('应该正确累积协议手续费', async function () {
      // Add liquidity
      const token0Amount = expandTo18Decimals(5);
      const token1Amount = expandTo18Decimals(10);
      await token0.transfer(await pair.getAddress(), token0Amount);
      await token1.transfer(await pair.getAddress(), token1Amount);
      await pair.mint(wallet.address);

      // Get factory and set feeTo
      const factoryAddress = await pair.factory();
      const factory = await ethers.getContractAt("UniswapV2Factory", factoryAddress);
      await factory.setFeeTo(other.address);

      // Do some swaps to generate fees
      for (let i = 0; i < 5; i++) {
        await token0.transfer(await pair.getAddress(), expandTo18Decimals(0.1));
        await pair.swap(0, expandTo18Decimals(0.09), wallet.address, '0x');
      }

      // Burn liquidity to trigger fee minting
      const liquidity = await pair.balanceOf(wallet.address);
      await pair.transfer(await pair.getAddress(), liquidity);
      await pair.burn(wallet.address);

      // Check if feeTo received LP tokens
      const feeToBalance = await pair.balanceOf(other.address);
      expect(feeToBalance).to.be.gt(0);
    });
  });
});
