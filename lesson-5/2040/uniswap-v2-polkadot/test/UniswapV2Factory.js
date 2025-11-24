const {chai, expect } = require("chai");
const { expandTo18Decimals, getWallets } = require('./shared/utilities');
const hre = require("hardhat");
const { 
  BigInt,
  getBigInt,
  getAddress,
  keccak256,
  AbiCoder,
  toUtf8Bytes,
  getCreate2Address,
  solidityPacked,
  Contract,
} = require('ethers')


const TEST_ADDRESSES = [
  '0x1000000000000000000000000000000000000000',
  '0x2000000000000000000000000000000000000000'
];

const TOTAL_SUPPLY = expandTo18Decimals(10000)

describe('UniswapV2Factory', function () {

let wallet;
let other;
let deployer;
let hasMultipleSigners = false;

let token;
let factory;

 
  beforeEach(async function () {
    const signers = await ethers.getSigners();
    wallet = signers[0];
    
    if (signers.length > 1) {
      other = signers[1];
      hasMultipleSigners = true;
    } else {
      other = wallet;
      hasMultipleSigners = false;
    }

    // NOTE: It's not necessary to deploy the pair contract
    // while pallet-revive now require the code exists on chain
    // before it is deployed inside a contract.
    let UniswapV2Pair;
    if (hre.network.config?.polkavm === true) {
      // Use the first signer for deploying the pair contract on PolkaVM
      UniswapV2Pair = await ethers.getContractFactory("UniswapV2Pair", signers[0]);
    } else {
      UniswapV2Pair = await ethers.getContractFactory("UniswapV2Pair");
    }
    
    let pair = await UniswapV2Pair.deploy();
    await pair.waitForDeployment();

    const ERC20 = await ethers.getContractFactory("contracts/test/ERC20.sol:ERC20");
    tokenA = await ERC20.deploy(expandTo18Decimals(10000));
    await tokenA.waitForDeployment();
    tokenB = await ERC20.deploy(expandTo18Decimals(10000));
    await tokenB.waitForDeployment();

    const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
    factory = await UniswapV2Factory.deploy(wallet.address);
    await factory.waitForDeployment();
  });
  
  it('feeTo, feeToSetter, allPairsLength', async function() {
    expect(await factory.feeTo()).to.eq(ethers.ZeroAddress);
    expect(await factory.feeToSetter()).to.eq(wallet.address);
    expect(await factory.allPairsLength()).to.eq(0);
  });

  it('createPair', async function() {
    const token0 = await tokenA.getAddress();
    const token1 = await tokenB.getAddress();
    
    // We're not going to check the exact addresses in the event since they may vary
    await expect(factory.createPair(token0, token1)).to.emit(factory, "PairCreated");
    
    await expect(factory.createPair(token0, token1)).to.be.revertedWith("UniswapV2: PAIR_EXISTS");
    await expect(factory.createPair(token1, token0)).to.be.revertedWith("UniswapV2: PAIR_EXISTS");
    expect(await factory.allPairsLength()).to.eq(1);
  });

  it('createPair:reverse', async function() {
    const token0 = await tokenA.getAddress();
    const token1 = await tokenB.getAddress();
    
    // First create a pair
    await factory.createPair(token0, token1);
    
    // Try to create the reverse pair - should fail
    await expect(factory.createPair(token1, token0)).to.be.revertedWith("UniswapV2: PAIR_EXISTS");
    expect(await factory.allPairsLength()).to.eq(1);
  });

  it('setFeeTo', async function() {
    if (!hasMultipleSigners) {
      console.log('Skipping setFeeTo test - requires multiple signers');
      return;
    }
    
    let otherAddress = await other.getAddress();
    let walletAddress = await wallet.getAddress();
    await expect(factory.connect(other).setFeeTo(otherAddress))
      .to.be.revertedWith('UniswapV2: FORBIDDEN');
    await factory.setFeeTo(walletAddress);
    expect(await factory.feeTo()).to.eq(walletAddress);
  });

  it('setFeeToSetter', async function() {
    if (!hasMultipleSigners) {
      console.log('Skipping setFeeToSetter test - requires multiple signers');
      return;
    }
    
    let otherAddress = await other.getAddress();
    let walletAddress = await wallet.getAddress();
    await expect(factory.connect(other).setFeeToSetter(otherAddress))
      .to.be.revertedWith('UniswapV2: FORBIDDEN');

    await factory.setFeeToSetter(otherAddress);
    expect(await factory.feeToSetter()).to.eq(otherAddress);
    await expect(factory.setFeeToSetter(walletAddress))
      .to.be.revertedWith('UniswapV2: FORBIDDEN');
  });

});