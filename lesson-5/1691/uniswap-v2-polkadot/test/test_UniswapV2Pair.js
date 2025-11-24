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

  it('调用mint, 并且验证token的数量', async function() {
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

    expect(await pair.totalSupply()).to.eq(expectedLiquidity); // 初始的LP比例 = √(x * y) 开始的LP总量
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
    await pair.mint(wallet.address)
  }

  it('Liquidity边界测试', async function(){
    const token0Amount = expandTo18Decimals(1);
    const token1Amount = expandTo18Decimals(4);
    await token0.transfer(await pair.getAddress(), token0Amount);
    await token1.transfer(await pair.getAddress(), token1Amount);
    await pair.mint(wallet.address)
    expect(await token0.balanceOf(await pair.getAddress())).to.eq(token0Amount);
    expect(await token1.balanceOf(await pair.getAddress())).to.eq(token1Amount);

    const [reverse0, reverse1] = await pair.getReserves();
    const totalSupply = await pair.totalSupply(); // 目前总量是2个LP

    const token0Amount2 = expandTo18Decimals(2);
    const token1Amount2 = token0Amount2 * reverse1 / reverse0;
    await token0.transfer(await pair.getAddress(), token0Amount2);
    await token1.transfer(await pair.getAddress(), token1Amount2);
    await pair.mint(wallet.address)
    expect(await pair.totalSupply()).to.eq(totalSupply + 2n * totalSupply) // 多了4个LP
    
  })

  function getAmountOut(amountIn, reserveIn, reserveOut) {
    if (amountIn <= 0n) throw new Error("amountIn=0");
    if (reserveIn <= 0n || reserveOut <= 0n) throw new Error("bad reserves");

    const amountInWithFee = amountIn * 997n;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 1000n + amountInWithFee;
    return numerator / denominator;
  }

  const swapTestCases = [
    [1, 5, 10],
    [1, 10, 5],
    [2, 5, 10],
    [2, 10, 5],
    [1, 10, 10],
    [1, 100, 100],
    [1, 1000, 1000]
  ].map(a => a.map(n => typeof n === 'string' ? BigInt(n) : expandTo18Decimals(n)));

  swapTestCases.forEach((swapTestCase, i) => {
    it(`用户用指定数量的token0 swap得 token1:${i}`, async function() {
      this.timeout(60000)
      const [swapAmount, token0Amount, token1Amount] = swapTestCase;
      const _except_out = getAmountOut(swapAmount, token0Amount, token1Amount) // 能够兑换出的token1的数量
      await addLiquidity(token0Amount, token1Amount);
      await token0.transfer(await pair.getAddress(), swapAmount);
      await expect(pair.swap(0, _except_out + 1n, wallet.address, '0x')) // 如果超过则报错
        .to.be.revertedWith('UniswapV2: K');
      await pair.swap(0, _except_out, wallet.address, '0x');
    });
  });

  const optimisticTestCases = [
    ['997000000000000000', 5, 10, 1],
    ['997000000000000000', 10, 5, 1],
    ['997000000000000000', 5, 5, 1],
    [1, 5, 5, '1003009027081243732']
  ].map(a => a.map(n => typeof n === 'string' ? BigInt(n) : expandTo18Decimals(n)));

  optimisticTestCases.forEach((optimisticTestCase, i) => {
    it(`用户通过token0 swap得指定数量的token1:${i}`, async function() {
      this.timeout(60000)
      const [outputAmount, token0Amount, token1Amount, inputAmount] = optimisticTestCase;
      await addLiquidity(token0Amount, token1Amount);
      await token0.transfer(await pair.getAddress(), inputAmount);
      await expect(pair.swap(outputAmount + 1n, 0, wallet.address, '0x'))
        .to.be.revertedWith('UniswapV2: K');
      await pair.swap(outputAmount, 0, wallet.address, '0x');
    });
  });

  it('调用swap token0', async function() {
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

  it('调用swap:token1', async function() {
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

  it('调用burn', async function() {
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

  it('关闭feeTo:off', async function() {
    this.timeout(70000)
    const token0Amount = expandTo18Decimals(1000);
    const token1Amount = expandTo18Decimals(1000);
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = expandTo18Decimals(1);
    const expectedOutputAmount = getAmountOut(swapAmount, token0Amount, token1Amount);
    await token1.transfer(await pair.getAddress(), swapAmount);
    await pair.swap(expectedOutputAmount, 0, wallet.address, '0x');

    const expectedLiquidity = expandTo18Decimals(1000);
    await pair.transfer(await pair.getAddress(), expectedLiquidity - MINIMUM_LIQUIDITY);
    let receipt = await pair.burn(wallet.address);
    await receipt.wait();
    expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY);
  });

  it('开启feeTo:on', async function() {
    this.timeout(140000)

    await factory.setFeeTo(other.address);

    const token0Amount = expandTo18Decimals(1000);
    const token1Amount = expandTo18Decimals(1000);
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = expandTo18Decimals(1);
    const expectedOutputAmount = getAmountOut(swapAmount, token0Amount, token1Amount);
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
});
