const {chai, expect } = require("chai");
const { expandTo18Decimals } = require('./shared/utilities');
const hre = require("hardhat");
const { 
  BigInt,
  getBigInt,
  getAddress,
  keccak256,
  AbiCoder,
  toUtf8Bytes,
  solidityPack,
  MaxUint256
} = require('ethers')
// chai.use(solidity)

const TOTAL_SUPPLY = expandTo18Decimals(10000)
const TEST_AMOUNT = expandTo18Decimals(10)

describe('UniswapV2ERC20', function () {

  let token;
  let wallet;
  let other;
  
  beforeEach(async function () {
    const ERC20 = await ethers.getContractFactory("contracts/test/ERC20.sol:ERC20");

    token = await ERC20.deploy(TOTAL_SUPPLY);
    await token.waitForDeployment();
    
    const signers = await ethers.getSigners();
    wallet = signers[0];
    
    // 确定转账金额
    let value;
    if (hre.network.name === 'local') {
      value = ethers.parseEther('100') // Local node has higher gas fees
    } else {
      value = ethers.parseEther('1')
    }
    
    // 检查是否需要创建第二个账户
    if (signers.length < 2) {
      // PolkaVM 模式：只有 1 个账户，动态创建第二个
      const randomWallet = ethers.Wallet.createRandom();
      other = randomWallet.connect(ethers.provider);
      
      // 直接充值到新账户
      await wallet.sendTransaction({
        to: other.address,
        value: value
      });
      
      console.log('✅ Created and funded second account for ERC20 tests:', other.address);
    } else {
      // EVM 模式：使用预置的第二个账户
      other = signers[1];
      
      // 给第二个账户充值
      await wallet.sendTransaction({
        to: other.address,
        value: value
      });
    }
  });

  it('name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH', async () => {
    const [deployer] = await ethers.getSigners();
    const abiCoder = new AbiCoder();
    const name = await token.name();
    expect(name).to.eq('Uniswap V2');
    expect(await token.symbol()).to.eq('UNI-V2')
    expect(await token.decimals()).to.eq(18)
    expect(await token.totalSupply()).to.eq(TOTAL_SUPPLY)
    expect(await token.balanceOf(deployer.address)).to.eq(TOTAL_SUPPLY)

    let token_address = await token.getAddress();
    let chainId = (await ethers.provider.getNetwork()).chainId;
    expect(await token.DOMAIN_SEPARATOR()).to.eq(
      keccak256(
        abiCoder.encode(
          ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
          [
            keccak256(
              toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
            ),
            keccak256(toUtf8Bytes(name)),
            keccak256(toUtf8Bytes('1')),
            chainId,
            token_address
          ]
        )
      )
    )
    expect(await token.PERMIT_TYPEHASH()).to.eq(
      keccak256(toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'))
    )
  })

  it('approve', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    await expect(token.approve(otherAddress, TEST_AMOUNT))
      .to.emit(token, 'Approval')
      .withArgs(walletAddress, otherAddress, TEST_AMOUNT)
    expect(await token.allowance(walletAddress, otherAddress)).to.eq(TEST_AMOUNT)
  })

  it('transfer', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    await expect(token.transfer(otherAddress, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(walletAddress, otherAddress, TEST_AMOUNT)
    expect(await token.balanceOf(walletAddress)).to.eq(TOTAL_SUPPLY - TEST_AMOUNT)
    expect(await token.balanceOf(otherAddress)).to.eq(TEST_AMOUNT)
  })

  it('transfer:fail', async () => {
    let otherAddress = await other.getAddress();
    let walletAddress = await wallet.getAddress();
    await expect(token.transfer(otherAddress, TOTAL_SUPPLY + 1n)).to.be.reverted // ds-math-sub-underflow
    await expect(token.connect(other).transfer(walletAddress, 1)).to.be.reverted // ds-math-sub-underflow
  })

  it('transferFrom', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    await token.approve(otherAddress, TEST_AMOUNT);
    expect(await token.allowance(walletAddress, otherAddress)).to.eq(TEST_AMOUNT)
    await expect(token.connect(other).transferFrom(walletAddress, otherAddress, TEST_AMOUNT))
    .to.emit(token, 'Transfer')
      .withArgs(walletAddress, otherAddress, TEST_AMOUNT)
    expect(await token.allowance(walletAddress, otherAddress)).to.eq(0)
    expect(await token.balanceOf(walletAddress)).to.eq(TOTAL_SUPPLY - TEST_AMOUNT)
    expect(await token.balanceOf(otherAddress)).to.eq(TEST_AMOUNT)
  })

  it('transferFrom:max', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    await token.approve(otherAddress, ethers.MaxUint256)
    await expect(token.connect(other).transferFrom(walletAddress, otherAddress, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(walletAddress, otherAddress, TEST_AMOUNT)
    expect(await token.allowance(walletAddress, otherAddress)).to.eq(MaxUint256)
    expect(await token.balanceOf(walletAddress)).to.eq(TOTAL_SUPPLY - TEST_AMOUNT)
    expect(await token.balanceOf(otherAddress)).to.eq(TEST_AMOUNT)
  })

})