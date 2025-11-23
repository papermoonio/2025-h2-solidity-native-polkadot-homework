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
  let hasMultipleSigners = false;
  
  beforeEach(async function () {
    const ERC20 = await ethers.getContractFactory("contracts/test/ERC20.sol:ERC20");

    token = await ERC20.deploy(TOTAL_SUPPLY);
    await token.waitForDeployment();
    const signers = await ethers.getSigners();
    wallet = signers[0];
    
    // Check if we have multiple signers
    if (signers.length > 1) {
      other = signers[1];
      hasMultipleSigners = true;
    } else {
      // Use the same wallet for both roles if only one signer available
      other = wallet;
      hasMultipleSigners = false;
    }

    // Only transfer balance if we have multiple distinct signers
    if (hasMultipleSigners) {
      let value;

      if (hre.network.name === 'local') {
        value = ethers.parseEther('100') // Local node has higher gas fees
      } else {
        value = ethers.parseEther('1')
      }

      // send balance to other
      let otherAddress = await other.getAddress();
      await wallet.sendTransaction({
        to: otherAddress,
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
    if (!hasMultipleSigners) {
      console.log('Skipping approve test - requires multiple signers');
      return;
    }
    
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    await expect(token.approve(otherAddress, TEST_AMOUNT))
      .to.emit(token, 'Approval')
      .withArgs(walletAddress, otherAddress, TEST_AMOUNT)
    expect(await token.allowance(walletAddress, otherAddress)).to.eq(TEST_AMOUNT)
  })

  it('transfer', async () => {
    if (!hasMultipleSigners) {
      console.log('Skipping transfer test - requires multiple signers');
      return;
    }
    
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    await expect(token.transfer(otherAddress, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(walletAddress, otherAddress, TEST_AMOUNT)
    expect(await token.balanceOf(walletAddress)).to.eq(TOTAL_SUPPLY - TEST_AMOUNT)
    expect(await token.balanceOf(otherAddress)).to.eq(TEST_AMOUNT)
  })

  it('transfer:fail', async () => {
    if (!hasMultipleSigners) {
      console.log('Skipping transfer:fail test - requires multiple signers');
      return;
    }
    
    let otherAddress = await other.getAddress();
    let walletAddress = await wallet.getAddress();
    await expect(token.transfer(otherAddress, TOTAL_SUPPLY + 1n)).to.be.reverted // ds-math-sub-underflow
    await expect(token.connect(other).transfer(walletAddress, 1)).to.be.reverted // ds-math-sub-underflow
  })

  it('transferFrom', async () => {
    if (!hasMultipleSigners) {
      console.log('Skipping transferFrom test - requires multiple signers');
      return;
    }
    
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
    if (!hasMultipleSigners) {
      console.log('Skipping transferFrom:max test - requires multiple signers');
      return;
    }
    
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