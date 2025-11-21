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

const TEST_ADDRESSES2 = [
  '0x3000000000000000000000000000000000000000',
  '0x4000000000000000000000000000000000000000'
]

const TOTAL_SUPPLY = expandTo18Decimals(10000)

describe('UniswapV2Factory', function () {

let wallet;
let other;
let deployer;

let token;
let factory;

 
  beforeEach(async function () {


    [wallet, other] = await hre.ethers.getSigners();
    // console.log("deployer:", await wallet.getAddress());
    // console.log("balance:", await hre.ethers.provider.getBalance(wallet.address));

    // NOTE: It's not necessary to deploy the pair contract
    // while pallet-revive now require the code exists on chain
    // before it is deployed inside a contract.
    let UniswapV2Pair;
    if (hre.network.polkavm === true) {
      UniswapV2Pair = await hre.ethers.getContractFactory("UniswapV2Pair", getWallets(1)[0]);
    } else {
      UniswapV2Pair = await hre.ethers.getContractFactory("UniswapV2Pair");
    }
    // const UniswapV2Pair = await hre.ethers.getContractFactory("UniswapV2Pair");
    let pair = await UniswapV2Pair.deploy();
    await pair.waitForDeployment();

    const ERC20 = await hre.ethers.getContractFactory("contracts/test/ERC20.sol:ERC20");
    token = await ERC20.deploy(TOTAL_SUPPLY);
    await token.waitForDeployment();


    const UniswapV2Factory = await hre.ethers.getContractFactory("UniswapV2Factory");
    factory = await UniswapV2Factory.deploy(wallet.address);
    await factory.waitForDeployment();

  });
  
  it('判断参数feeTo, feeToSetter, allPairsLength是否与合约相同', async function() {
    expect(await factory.feeTo()).to.eq(hre.ethers.ZeroAddress);
    expect(await factory.feeToSetter()).to.eq(wallet.address);
    expect(await factory.allPairsLength()).to.eq(0);
  });

  async function createPair(tokens, test_addresses) {
    const UniswapV2Pair = await hre.ethers.getContractFactory("UniswapV2Pair");
    const bytecode = UniswapV2Pair.bytecode;
    const initCodeHash = keccak256(bytecode);
    const [token0, token1] = tokens[0] < tokens[1] ? [tokens[0], tokens[1]] : [tokens[1], tokens[0]];
    const allPairsLength = await factory.allPairsLength()

    let salt = keccak256(solidityPacked(['address', 'address'], [token0, token1]));
    const create2Address = getCreate2Address(await factory.getAddress(), salt, initCodeHash);

    await expect(factory.createPair(tokens[0], tokens[1])).to.emit(factory, "PairCreated")
    .withArgs(test_addresses[0], test_addresses[1], create2Address, allPairsLength + 1n);

    await expect(factory.createPair(...tokens)).to.be.reverted; // UniswapV2: PAIR_EXISTS
    await expect(factory.createPair(...tokens.slice().reverse())).to.be.reverted; // UniswapV2: PAIR_EXISTS
    expect(await factory.getPair(...tokens)).to.eq(create2Address);
    expect(await factory.getPair(...tokens.slice().reverse())).to.eq(create2Address);
    expect(await factory.allPairs(allPairsLength)).to.eq(create2Address);
    expect(await factory.allPairsLength()).to.eq(allPairsLength + 1n);

    const pair = await hre.ethers.getContractAt("UniswapV2Pair", create2Address); 
    expect(await pair.factory()).to.eq(await factory.getAddress());
    expect(await pair.token0()).to.eq(test_addresses[0]);
    expect(await pair.token1()).to.eq(test_addresses[1]);
  }

  it('调用createPair', async function() {
    await createPair(TEST_ADDRESSES, TEST_ADDRESSES);
  });

  it('调用多次createPair', async function() {
    await createPair(TEST_ADDRESSES, TEST_ADDRESSES);
    await createPair(TEST_ADDRESSES2, TEST_ADDRESSES2);
    expect(await factory.allPairsLength()).to.eq(2);
  })

  it('调用setFeeTo', async function() {
    this.timeout(1000000000000);
    let otherAddress = await other.getAddress();
    let walletAddress = await wallet.getAddress();
    await expect(factory.connect(other).setFeeTo(otherAddress))
      .to.be.revertedWith('UniswapV2: FORBIDDEN');
    await factory.setFeeTo(walletAddress);
    expect(await factory.feeTo()).to.eq(walletAddress);
  });

  it('调用setFeeToSetter', async function() {
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