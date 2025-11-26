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
  ZeroAddress,
  MaxUint256
} = require('ethers')
// chai.use(solidity)

const TOTAL_SUPPLY = expandTo18Decimals(10000)
const TEST_AMOUNT = expandTo18Decimals(10)

describe('UniswapV2ERC20', function () {

  let token;
  let wallet;
  let other;
  let domain;
  
  beforeEach(async function () {
    const ERC20 = await hre.ethers.getContractFactory("contracts/test/ERC20.sol:ERC20");

    token = await ERC20.deploy(TOTAL_SUPPLY);
    await token.waitForDeployment();
    [wallet, other] = await hre.ethers.getSigners();

    let value;

    if (hre.network.name === 'local') {
      value = hre.ethers.parseEther('100') // Local node has higher gas fees
    } else {
      value = hre.ethers.parseEther('1')
    }

    // send balance to other
    let otherAddress = await other.getAddress();
    await wallet.sendTransaction({
      to: otherAddress,
      value: value
    });

    domain = {
        name: await token.name(),
        version: "1",
        chainId: (await hre.ethers.provider.getNetwork()).chainId,
        verifyingContract: await token.getAddress()
    }
  });

  it('判断初始化参数是否与合约里相同', async () => {
    const [deployer] = await hre.ethers.getSigners();
    const abiCoder = new AbiCoder();
    const name = await token.name();
    expect(name).to.eq('Uniswap V2');
    expect(await token.symbol()).to.eq('UNI-V2')
    expect(await token.decimals()).to.eq(18)
    expect(await token.totalSupply()).to.eq(TOTAL_SUPPLY)
    expect(await token.balanceOf(deployer.address)).to.eq(TOTAL_SUPPLY)

    let token_address = await token.getAddress();
    let chainId = (await hre.ethers.provider.getNetwork()).chainId;
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

  it('调用approve', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    await expect(token.approve(otherAddress, TEST_AMOUNT))
      .to.emit(token, 'Approval')
      .withArgs(walletAddress, otherAddress, TEST_AMOUNT)
    expect(await token.allowance(walletAddress, otherAddress)).to.eq(TEST_AMOUNT)
  })

  it('调用transfer', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    await expect(token.transfer(otherAddress, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(walletAddress, otherAddress, TEST_AMOUNT)
    expect(await token.balanceOf(walletAddress)).to.eq(TOTAL_SUPPLY - TEST_AMOUNT)
    expect(await token.balanceOf(otherAddress)).to.eq(TEST_AMOUNT)
  })

  it('调用transfer失败', async () => {
    let otherAddress = await other.getAddress();
    let walletAddress = await wallet.getAddress();
    await expect(token.transfer(otherAddress, TOTAL_SUPPLY + 1n)).to.be.reverted // ds-math-sub-underflow
    await expect(token.connect(other).transfer(walletAddress, 1)).to.be.reverted // ds-math-sub-underflow
  })

  it('调用transferFrom, 前提要有限权', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();

    await token.approve(otherAddress, TEST_AMOUNT);
    expect(await token.allowance(walletAddress, otherAddress)).to.eq(TEST_AMOUNT)

    await expect(token.connect(other).transferFrom(walletAddress, otherAddress, 2n * TEST_AMOUNT)).to.be.reverted // 太大额度
    await expect(token.connect(other).transferFrom(walletAddress, otherAddress, TEST_AMOUNT))
        .to.emit(token, 'Transfer')
        .withArgs(walletAddress, otherAddress, TEST_AMOUNT)
    expect(await token.allowance(walletAddress, otherAddress)).to.eq(0)
    expect(await token.balanceOf(walletAddress)).to.eq(TOTAL_SUPPLY - TEST_AMOUNT)
    expect(await token.balanceOf(otherAddress)).to.eq(TEST_AMOUNT)
  })

  it('调用transferFrom, 并给出最大调用额度', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    await token.approve(otherAddress, hre.ethers.MaxUint256)
    await expect(token.connect(other).transferFrom(walletAddress, otherAddress, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(walletAddress, otherAddress, TEST_AMOUNT)
    expect(await token.allowance(walletAddress, otherAddress)).to.eq(MaxUint256)
    expect(await token.balanceOf(walletAddress)).to.eq(TOTAL_SUPPLY - TEST_AMOUNT)
    expect(await token.balanceOf(otherAddress)).to.eq(TEST_AMOUNT)
  })

  it('调用Permit, 并调用transferFrom', async () => {
    const walletAddress = await wallet.getAddress();
    const otherAddress = await other.getAddress();
    const nonce = await token.nonces(walletAddress);
    const deadline = (await hre.ethers.provider.getBlock()).timestamp + 3600;
    const types = {
        Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
        ],
    };
    const message = {
        owner: walletAddress,
        spender: otherAddress,
        value: TEST_AMOUNT,
        nonce,
        deadline
    };
    const signature = await wallet.signTypedData(domain, types, message);
    const { v, r, s } = hre.ethers.Signature.from(signature);

    await expect(token.permit(walletAddress, otherAddress, TEST_AMOUNT, deadline, v, r, s))
        .to.emit(token, "Approval")
        .withArgs(walletAddress, otherAddress, TEST_AMOUNT);
    expect(await token.allowance(walletAddress, otherAddress)).to.eq(TEST_AMOUNT);
    expect(await token.nonces(walletAddress)).to.eq(nonce + 1n);

    await expect(token.connect(other).transferFrom(walletAddress, otherAddress, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(walletAddress, otherAddress, TEST_AMOUNT)
  })

})