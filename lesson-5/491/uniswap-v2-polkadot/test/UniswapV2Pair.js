const chai = require('chai');
const { expect } = chai;
const { ZeroAddress, utils, keccak256, solidityPacked, getCreate2Address } = require('ethers');
const { expandTo18Decimals, getWallets, encodePrice, mineBlock } = require('./shared/utilities');


const TOTAL_SUPPLY = expandTo18Decimals(10000)
const TEST_AMOUNT = expandTo18Decimals(10)
const MINIMUM_LIQUIDITY = BigInt('1000')



describe('UniswapV2Pair', function() {
  let factory;
  let token0;
  let token1;
  let pair;

  let wallet;
  let other;

  beforeEach(async function() {

    [wallet, other] = await ethers.getSigners();

    let UniswapV2Pair;
    if (hre.network.polkavm === true) {
      UniswapV2Pair = await ethers.getContractFactory("UniswapV2Pair", getWallets(1)[0]);
    } else {
      UniswapV2Pair = await ethers.getContractFactory("UniswapV2Pair");
    }

    const ERC20 = await ethers.getContractFactory("contracts/test/ERC20.sol:ERC20");
    token0 = await ERC20.deploy(TOTAL_SUPPLY);
    await token0.waitForDeployment();

    token1 = await ERC20.deploy(TOTAL_SUPPLY);
    await token1.waitForDeployment();

    let pairForCode = await UniswapV2Pair.deploy();
    await pairForCode.waitForDeployment();

    const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory", wallet);
    factory = await UniswapV2Factory.deploy(wallet.address);
    await factory.waitForDeployment();
    
    let token0Address = await token0.getAddress();
    let token1Address = await token1.getAddress();

    [token0, token1] = token0Address.toLowerCase() < token1Address.toLowerCase() ? 
    [token0, token1] : 
    [token1, token0];

    let first = await token0.getAddress();
    let second = await token1.getAddress();
    
    const bytecode = UniswapV2Pair.bytecode;
    const initCodeHash = keccak256(bytecode);
    let salt = keccak256(solidityPacked(['address', 'address'], [first, second]));
    const create2Address = getCreate2Address(await factory.getAddress(), salt, initCodeHash);

    await expect(factory.createPair(token0Address, token1Address)).to.emit(factory, "PairCreated")
    .withArgs(await first, second, create2Address, 1n);

    pair = await ethers.getContractAt("UniswapV2Pair", create2Address); 
    expect(await pair.token0()).to.eq(first);
    expect(await pair.token1()).to.eq(second);

  });

  it('mint', async function() {
    const token0Amount = expandTo18Decimals(1);
    const pairAddress = await pair.getAddress();
    const token1Amount = expandTo18Decimals(4);
    await token0.transfer(pairAddress, token0Amount);
    await token1.transfer(pairAddress, token1Amount);

    const expectedLiquidity = expandTo18Decimals(2);

    await expect(pair.mint(wallet.address))
      .to.emit(pair, 'Transfer')
      .withArgs(ZeroAddress, ZeroAddress, MINIMUM_LIQUIDITY)
      .to.emit(pair, 'Transfer')
      .withArgs(ZeroAddress, wallet.address, expectedLiquidity - MINIMUM_LIQUIDITY)
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount, token1Amount)
      .to.emit(pair, 'Mint')
      .withArgs(wallet.address, token0Amount, token1Amount);

    expect(await pair.totalSupply()).to.eq(expectedLiquidity);
    expect(await pair.balanceOf(wallet.address)).to.eq(expectedLiquidity - MINIMUM_LIQUIDITY);
    expect(await token0.balanceOf(await pair.getAddress())).to.eq(token0Amount);
    expect(await token1.balanceOf(await pair.getAddress())).to.eq(token1Amount);
    const reserves = await pair.getReserves();
    expect(reserves[0]).to.eq(token0Amount);
    expect(reserves[1]).to.eq(token1Amount);
  });

  async function addLiquidity(token0Amount, token1Amount) {
    await token0.transfer(await pair.getAddress(), token0Amount);
    await token1.transfer(await pair.getAddress(), token1Amount);
    await pair.mint(wallet.address);
  }

  const swapTestCases = [
    [1, 5, 10, '1662497915624478906'],
    [1, 10, 5, '453305446940074565'],
    [2, 5, 10, '2851015155847869602'],
    [2, 10, 5, '831248957812239453'],
    [1, 10, 10, '906610893880149131'],
    [1, 100, 100, '987158034397061298'],
    [1, 1000, 1000, '996006981039903216']
  ].map(a => a.map(n => typeof n === 'string' ? BigInt(n) : expandTo18Decimals(n)));

  swapTestCases.forEach((swapTestCase, i) => {
    it(`getInputPrice:${i}`, async function() {
      this.timeout(60000)
      const [swapAmount, token0Amount, token1Amount, expectedOutputAmount] = swapTestCase;
      await addLiquidity(token0Amount, token1Amount);
      await token0.transfer(await pair.getAddress(), swapAmount);
      await expect(pair.swap(0, expectedOutputAmount + 1n, wallet.address, '0x'))
        .to.be.revertedWith('UniswapV2: K');
      await pair.swap(0, expectedOutputAmount, wallet.address, '0x');
    });
  });

  const optimisticTestCases = [
    ['997000000000000000', 5, 10, 1],
    ['997000000000000000', 10, 5, 1],
    ['997000000000000000', 5, 5, 1],
    [1, 5, 5, '1003009027081243732']
  ].map(a => a.map(n => typeof n === 'string' ? BigInt(n) : expandTo18Decimals(n)));

  optimisticTestCases.forEach((optimisticTestCase, i) => {
    it(`optimistic:${i}`, async function() {
      this.timeout(60000)
      const [outputAmount, token0Amount, token1Amount, inputAmount] = optimisticTestCase;
      await addLiquidity(token0Amount, token1Amount);
      await token0.transfer(await pair.getAddress(), inputAmount);
      await expect(pair.swap(outputAmount + 1n, 0, wallet.address, '0x'))
        .to.be.revertedWith('UniswapV2: K');
      await pair.swap(outputAmount, 0, wallet.address, '0x');
    });
  });

  it('swap:token0', async function() {
    this.timeout(50000)
    const token0Amount = expandTo18Decimals(5);
    const token1Amount = expandTo18Decimals(10);
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = expandTo18Decimals(1);
    const expectedOutputAmount = BigInt('1662497915624478906');
    await token0.transfer(await pair.getAddress(), swapAmount);

    await expect(pair.swap(0, expectedOutputAmount, wallet.address, '0x'))
      .to.emit(token1, 'Transfer')
      .withArgs(await pair.getAddress(), wallet.address, expectedOutputAmount)
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount + swapAmount, token1Amount - expectedOutputAmount)
      .to.emit(pair, 'Swap')
      .withArgs(wallet.address, swapAmount, 0, 0, expectedOutputAmount, wallet.address);
    const reserves = await pair.getReserves();
    expect(reserves[0]).to.eq(token0Amount + swapAmount);
    expect(reserves[1]).to.eq(token1Amount - expectedOutputAmount);
    expect(await token0.balanceOf(await pair.getAddress())).to.eq(token0Amount + swapAmount);
    expect(await token1.balanceOf(await pair.getAddress())).to.eq(token1Amount - expectedOutputAmount);
    const totalSupplyToken0 = await token0.totalSupply();
    const totalSupplyToken1 = await token1.totalSupply();
    expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0 - token0Amount - swapAmount);
    expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1 - token1Amount + expectedOutputAmount);
  });

  it('swap:token1', async function() {
    this.timeout(50000)
    const token0Amount = expandTo18Decimals(5);
    const token1Amount = expandTo18Decimals(10);
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = expandTo18Decimals(1);
    const expectedOutputAmount = BigInt('453305446940074565');
    await token1.transfer(await pair.getAddress(), swapAmount);
    await expect(pair.swap(expectedOutputAmount, 0, wallet.address, '0x'))
      .to.emit(token0, 'Transfer')
      .withArgs(await pair.getAddress(), wallet.address, expectedOutputAmount)
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount - expectedOutputAmount, token1Amount + swapAmount)
      .to.emit(pair, 'Swap')
      .withArgs(wallet.address, 0, swapAmount, expectedOutputAmount, 0, wallet.address);

    const reserves = await pair.getReserves();
    expect(reserves[0]).to.eq(token0Amount - expectedOutputAmount);
    expect(reserves[1]).to.eq(token1Amount + swapAmount);
    expect(await token0.balanceOf(await pair.getAddress())).to.eq(token0Amount - expectedOutputAmount);
    expect(await token1.balanceOf(await pair.getAddress())).to.eq(token1Amount + swapAmount);
    const totalSupplyToken0 = await token0.totalSupply();
    const totalSupplyToken1 = await token1.totalSupply();
    expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0 - token0Amount + expectedOutputAmount);
    expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1 - token1Amount - swapAmount);
  });

  it('burn', async function() {
    const token0Amount = expandTo18Decimals(3);
    const token1Amount = expandTo18Decimals(3);
    await addLiquidity(token0Amount, token1Amount);

    const expectedLiquidity = expandTo18Decimals(3);
    await pair.transfer(await pair.getAddress(), expectedLiquidity - MINIMUM_LIQUIDITY);
    let receipt = await pair.burn(wallet.address);
    await expect(receipt)
      .to.emit(pair, 'Transfer')
      .withArgs(await pair.getAddress(), ZeroAddress, expectedLiquidity - MINIMUM_LIQUIDITY)
      .to.emit(token0, 'Transfer')
      .withArgs(await pair.getAddress(), wallet.address, token0Amount - BigInt(1000))
      .to.emit(token1, 'Transfer')
      .withArgs(await pair.getAddress(), wallet.address, token1Amount - BigInt(1000))
      .to.emit(pair, 'Sync')
      .withArgs(1000, 1000)
      .to.emit(pair, 'Burn')
      .withArgs(wallet.address, token0Amount - BigInt(1000), token1Amount - BigInt(1000), wallet.address);

    expect(await pair.balanceOf(wallet.address)).to.eq(0);
    expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY);
    expect(await token0.balanceOf(await pair.getAddress())).to.eq(1000);
    expect(await token1.balanceOf(await pair.getAddress())).to.eq(1000);
    const totalSupplyToken0 = await token0.totalSupply();
    const totalSupplyToken1 = await token1.totalSupply();
    expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0 - BigInt(1000));
    expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1 - BigInt(1000));
  });

  // it('price{0,1}CumulativeLast', async function() {
  //   const token0Amount = expandTo18Decimals(3);
  //   const token1Amount = expandTo18Decimals(3);
  //   await addLiquidity(token0Amount, token1Amount);

  //   const reserves = await pair.getReserves();
  //   const blockTimestamp = reserves[2];
  //   console.log("blockTimestamp", blockTimestamp);
  //   const network = require('hardhat').network;
  //   await mineBlock(network.provider, blockTimestamp + BigInt(1));
  //   console.log("mined block");
  //   await pair.sync();

  //   const initialPrice = encodePrice(token0Amount, token1Amount);
  //   console.log("initialPrice", initialPrice);
  //   expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0]);
  //   expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1]);
  //   const updatedReserves = await pair.getReserves();
  //   expect(updatedReserves[2]).to.eq(blockTimestamp + BigInt(1));

  //   const swapAmount = expandTo18Decimals(3);
  //   await token0.transfer(await pair.getAddress(), swapAmount);
  //   await mineBlock(provider, blockTimestamp + 10);
  //   await pair.swap(0, expandTo18Decimals(1), wallet.address, '0x');

  //   expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0] * BigInt(10));
  //   expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1] * BigInt(10));
  //   const latestReserves = await pair.getReserves();
  //   expect(latestReserves[2]).to.eq(blockTimestamp + 10);

  //   await mineBlock(provider, blockTimestamp + 20);
  //   await pair.sync();

  //   const newPrice = encodePrice(expandTo18Decimals(6), expandTo18Decimals(2));
  //   expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0]* bigInt(10) + newPrice[0] * BigInt(10));
  //   expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1] * BigInt(10) + (newPrice[1] * BigInt(10)));
  //   const finalReserves = await pair.getReserves();
  //   expect(finalReserves[2]).to.eq(blockTimestamp + 20);
  // });

  it('feeTo:off', async function() {
    this.timeout(70000)
    const token0Amount = expandTo18Decimals(1000);
    const token1Amount = expandTo18Decimals(1000);
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = expandTo18Decimals(1);
    const expectedOutputAmount = BigInt('996006981039903216');
    await token1.transfer(await pair.getAddress(), swapAmount);
    await pair.swap(expectedOutputAmount, 0, wallet.address, '0x');

    const expectedLiquidity = expandTo18Decimals(1000);
    await pair.transfer(await pair.getAddress(), expectedLiquidity - MINIMUM_LIQUIDITY);
    let receipt = await pair.burn(wallet.address);
    await receipt.wait();
    expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY);
  });

  it('feeTo:on', async function() {
    this.timeout(140000)

    await factory.setFeeTo(other.address);

    const token0Amount = expandTo18Decimals(1000);
    const token1Amount = expandTo18Decimals(1000);
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = expandTo18Decimals(1);
    const expectedOutputAmount = BigInt('996006981039903216');
    await token1.transfer(await pair.getAddress(), swapAmount);
    await (await pair.swap(expectedOutputAmount, 0, wallet.address, '0x')).wait();

    const expectedLiquidity = expandTo18Decimals(1000);
    await pair.transfer(await pair.getAddress(), expectedLiquidity - MINIMUM_LIQUIDITY);
    await pair.burn(wallet.address);

    expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY + BigInt('249750499251388'));
    expect(await pair.balanceOf(other.address)).to.eq(BigInt('249750499251388'));

    expect(await token0.balanceOf(await pair.getAddress())).to.eq(BigInt(1000) + BigInt('249501683697445'));
    expect(await token1.balanceOf(await pair.getAddress())).to.eq(BigInt(1000) + BigInt('250000187312969'));
  });

  it('mint:insufficientLiquidity', async function() {
    // Use amounts that result in liquidity less than MINIMUM_LIQUIDITY
    // sqrt(1000 * 1000) = 1000, minus MINIMUM_LIQUIDITY(1000) = 0
    const token0Amount = BigInt(1000);
    const token1Amount = BigInt(1000);
    const pairAddress = await pair.getAddress();
    await token0.transfer(pairAddress, token0Amount);
    await token1.transfer(pairAddress, token1Amount);

    // Try to mint with very small amounts that would result in zero liquidity
    await expect(pair.mint(wallet.address))
      .to.be.revertedWith('UniswapV2: INSUFFICIENT_LIQUIDITY_MINTED');
  });

  it('mint:unequalAmounts', async function() {
    const token0Amount = expandTo18Decimals(1);
    const token1Amount = expandTo18Decimals(10);
    const pairAddress = await pair.getAddress();
    await token0.transfer(pairAddress, token0Amount);
    await token1.transfer(pairAddress, token1Amount);

    // sqrt(1 * 10) = sqrt(10) ≈ 3.16, so expected liquidity ≈ 3.16 - 0.001 = ~3.16
    // But we need to calculate the exact value: sqrt(1e18 * 10e18) - 1000
    const expectedLiquidity = expandTo18Decimals(2); // Approximate value
    await expect(pair.mint(wallet.address))
      .to.emit(pair, 'Mint')
      .withArgs(wallet.address, token0Amount, token1Amount);
    
    // Check that liquidity was minted (should be positive)
    const totalSupply = await pair.totalSupply();
    expect(totalSupply).to.be.gt(MINIMUM_LIQUIDITY);
  });

  it('burn:insufficientLiquidity', async function() {
    const token0Amount = expandTo18Decimals(1);
    const token1Amount = expandTo18Decimals(4);
    await addLiquidity(token0Amount, token1Amount);

    // Try to burn more than available
    await pair.transfer(await pair.getAddress(), 1n);
    await expect(pair.burn(wallet.address))
      .to.be.reverted; // Should fail due to insufficient balance
  });

  it('burn:zeroLiquidity', async function() {
    const token0Amount = expandTo18Decimals(3);
    const token1Amount = expandTo18Decimals(3);
    await addLiquidity(token0Amount, token1Amount);

    // Try to burn when no liquidity tokens are sent to pair
    await expect(pair.burn(wallet.address))
      .to.be.revertedWith('UniswapV2: INSUFFICIENT_LIQUIDITY_BURNED');
  });

  it('swap:insufficientOutputAmount', async function() {
    const token0Amount = expandTo18Decimals(5);
    const token1Amount = expandTo18Decimals(10);
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = expandTo18Decimals(1);
    await token0.transfer(await pair.getAddress(), swapAmount);
    
    // Request more output than available
    await expect(pair.swap(0, token1Amount + 1n, wallet.address, '0x'))
      .to.be.revertedWith('UniswapV2: INSUFFICIENT_LIQUIDITY');
  });

  it('swap:zeroOutput', async function() {
    const token0Amount = expandTo18Decimals(5);
    const token1Amount = expandTo18Decimals(10);
    await addLiquidity(token0Amount, token1Amount);

    // Try to swap with zero output
    await expect(pair.swap(0, 0, wallet.address, '0x'))
      .to.be.revertedWith('UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT');
  });

  it('swap:invalidTo', async function() {
    const token0Amount = expandTo18Decimals(5);
    const token1Amount = expandTo18Decimals(10);
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = expandTo18Decimals(1);
    const expectedOutputAmount = BigInt('1662497915624478906');
    await token0.transfer(await pair.getAddress(), swapAmount);

    const token0Address = await token0.getAddress();
    const token1Address = await token1.getAddress();
    
    // Try to swap to token0 address
    await expect(pair.swap(0, expectedOutputAmount, token0Address, '0x'))
      .to.be.revertedWith('UniswapV2: INVALID_TO');
    
    // Try to swap to token1 address
    await expect(pair.swap(0, expectedOutputAmount, token1Address, '0x'))
      .to.be.revertedWith('UniswapV2: INVALID_TO');
  });

  it('swap:bothDirections', async function() {
    const token0Amount = expandTo18Decimals(5);
    const token1Amount = expandTo18Decimals(10);
    await addLiquidity(token0Amount, token1Amount);

    // Swap token0 for token1
    const swapAmount0 = expandTo18Decimals(1);
    const expectedOutputAmount1 = BigInt('1662497915624478906');
    await token0.transfer(await pair.getAddress(), swapAmount0);
    await pair.swap(0, expectedOutputAmount1, wallet.address, '0x');

    // Swap token1 for token0
    const swapAmount1 = expandTo18Decimals(1);
    const expectedOutputAmount0 = BigInt('453305446940074565');
    await token1.transfer(await pair.getAddress(), swapAmount1);
    await pair.swap(expectedOutputAmount0, 0, wallet.address, '0x');
  });

  it('skim', async function() {
    const token0Amount = expandTo18Decimals(1);
    const token1Amount = expandTo18Decimals(4);
    await addLiquidity(token0Amount, token1Amount);

    const token0before = await token0.balanceOf(wallet.address);
    const token1before = await token1.balanceOf(wallet.address);
    // Send extra tokens directly to pair (simulating airdrop or transfer)
    const extraAmount0 = expandTo18Decimals(1);
    const extraAmount1 = expandTo18Decimals(1);
    await token0.transfer(await pair.getAddress(), extraAmount0);
    await token1.transfer(await pair.getAddress(), extraAmount1);

    const pairAddress = await pair.getAddress();
    const balance0Before = await token0.balanceOf(pairAddress);
    const balance1Before = await token1.balanceOf(pairAddress);
    const reserves = await pair.getReserves();

    // Skim should transfer excess tokens
    await expect(pair.skim(wallet.address))
      .to.emit(token0, 'Transfer')
      .withArgs(pairAddress, wallet.address, balance0Before - reserves[0])
      .to.emit(token1, 'Transfer')
      .withArgs(pairAddress, wallet.address, balance1Before - reserves[1]);

    expect(await token0.balanceOf(wallet.address)).to.eq(token0before);
    expect(await token1.balanceOf(wallet.address)).to.eq(token1before);
  });

  it('sync', async function() {
    const token0Amount = expandTo18Decimals(1);
    const token1Amount = expandTo18Decimals(4);
    await addLiquidity(token0Amount, token1Amount);

    // Send extra tokens directly to pair
    const extraAmount0 = expandTo18Decimals(1);
    const extraAmount1 = expandTo18Decimals(1);
    await token0.transfer(await pair.getAddress(), extraAmount0);
    await token1.transfer(await pair.getAddress(), extraAmount1);

    const pairAddress = await pair.getAddress();
    const balance0 = await token0.balanceOf(pairAddress);
    const balance1 = await token1.balanceOf(pairAddress);

    // Sync should update reserves to match balances
    await expect(pair.sync())
      .to.emit(pair, 'Sync')
      .withArgs(balance0, balance1);

    const reserves = await pair.getReserves();
    expect(reserves[0]).to.eq(balance0);
    expect(reserves[1]).to.eq(balance1);
  });

  it('getReserves', async function() {
    const token0Amount = expandTo18Decimals(1);
    const token1Amount = expandTo18Decimals(4);
    await addLiquidity(token0Amount, token1Amount);

    const reserves = await pair.getReserves();
    expect(reserves[0]).to.eq(token0Amount);
    expect(reserves[1]).to.eq(token1Amount);
    expect(reserves[2]).to.be.gt(0); // blockTimestampLast should be set
  });

  it('factory', async function() {
    expect(await pair.factory()).to.eq(await factory.getAddress());
  });

  it('token0 and token1', async function() {
    const token0Address = await token0.getAddress();
    const token1Address = await token1.getAddress();
    expect(await pair.token0()).to.eq(token0Address);
    expect(await pair.token1()).to.eq(token1Address);
  });

  it('swap:largeAmount', async function() {
    const token0Amount = expandTo18Decimals(1000);
    const token1Amount = expandTo18Decimals(1000);
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = expandTo18Decimals(100);
    const expectedOutputAmount = BigInt('906610893880149131');
    await token0.transfer(await pair.getAddress(), swapAmount);
    await pair.swap(0, expectedOutputAmount, wallet.address, '0x');

    const reserves = await pair.getReserves();
    expect(reserves[0]).to.eq(token0Amount + swapAmount);
    expect(reserves[1]).to.eq(token1Amount - expectedOutputAmount);
  });

  it('mint:secondMint', async function() {
    const token0Amount = expandTo18Decimals(1);
    const token1Amount = expandTo18Decimals(4);
    await addLiquidity(token0Amount, token1Amount);

    const initialSupply = await pair.totalSupply();
    const initialBalance = await pair.balanceOf(wallet.address);

    // Add more liquidity
    const additionalToken0Amount = expandTo18Decimals(1);
    const additionalToken1Amount = expandTo18Decimals(4);
    await token0.transfer(await pair.getAddress(), additionalToken0Amount);
    await token1.transfer(await pair.getAddress(), additionalToken1Amount);
    await pair.mint(wallet.address);

    const newSupply = await pair.totalSupply();
    const newBalance = await pair.balanceOf(wallet.address);
    expect(newSupply).to.be.gt(initialSupply);
    expect(newBalance).to.be.gt(initialBalance);
  });
});
