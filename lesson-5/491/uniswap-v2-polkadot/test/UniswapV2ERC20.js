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
    [wallet, other] = await ethers.getSigners();

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

  it('approve:zero', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    await token.approve(otherAddress, 0)
    expect(await token.allowance(walletAddress, otherAddress)).to.eq(0)
  })

  it('approve:change', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    await token.approve(otherAddress, TEST_AMOUNT)
    expect(await token.allowance(walletAddress, otherAddress)).to.eq(TEST_AMOUNT)
    await token.approve(otherAddress, TEST_AMOUNT * 2n)
    expect(await token.allowance(walletAddress, otherAddress)).to.eq(TEST_AMOUNT * 2n)
  })

  it('transfer:zero', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    await expect(token.transfer(otherAddress, 0))
      .to.emit(token, 'Transfer')
      .withArgs(walletAddress, otherAddress, 0)
    expect(await token.balanceOf(walletAddress)).to.eq(TOTAL_SUPPLY)
    expect(await token.balanceOf(otherAddress)).to.eq(0)
  })

  it('transferFrom:insufficientAllowance', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    await token.approve(otherAddress, TEST_AMOUNT - 1n)
    await expect(token.connect(other).transferFrom(walletAddress, otherAddress, TEST_AMOUNT))
      .to.be.reverted // ds-math-sub-underflow
  })

  it('transferFrom:insufficientBalance', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    await token.approve(otherAddress, TOTAL_SUPPLY + 1n)
    await expect(token.connect(other).transferFrom(walletAddress, otherAddress, TOTAL_SUPPLY + 1n))
      .to.be.reverted // ds-math-sub-underflow
  })

  it('permit', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    const abiCoder = new AbiCoder();
    const name = await token.name();
    const tokenAddress = await token.getAddress();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const nonce = await token.nonces(walletAddress);
    const deadline = ethers.MaxUint256;
    const value = TEST_AMOUNT;

    const domain = {
      name: name,
      version: '1',
      chainId: chainId,
      verifyingContract: tokenAddress
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    };

    const message = {
      owner: walletAddress,
      spender: otherAddress,
      value: value,
      nonce: nonce,
      deadline: deadline
    };

    const signature = await wallet.signTypedData(domain, types, message);
    const { r, s, v } = ethers.Signature.from(signature);

    await expect(token.permit(walletAddress, otherAddress, value, deadline, v, r, s))
      .to.emit(token, 'Approval')
      .withArgs(walletAddress, otherAddress, value);
    
    expect(await token.allowance(walletAddress, otherAddress)).to.eq(value);
    expect(await token.nonces(walletAddress)).to.eq(nonce + 1n);
  })

  it('permit:fail', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    const abiCoder = new AbiCoder();
    const name = await token.name();
    const tokenAddress = await token.getAddress();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const nonce = await token.nonces(walletAddress);
    const deadline = ethers.MaxUint256;
    const value = TEST_AMOUNT;

    const domain = {
      name: name,
      version: '1',
      chainId: chainId,
      verifyingContract: tokenAddress
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    };

    const message = {
      owner: walletAddress,
      spender: otherAddress,
      value: value,
      nonce: nonce,
      deadline: deadline
    };

    // Sign with wrong signer
    const signature = await other.signTypedData(domain, types, message);
    const { r, s, v } = ethers.Signature.from(signature);

    await expect(token.permit(walletAddress, otherAddress, value, deadline, v, r, s))
      .to.be.revertedWith('UniswapV2: INVALID_SIGNATURE');
  })

  it('permit:expired', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    const name = await token.name();
    const tokenAddress = await token.getAddress();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const nonce = await token.nonces(walletAddress);
    const deadline = 1n; // Expired deadline
    const value = TEST_AMOUNT;

    const domain = {
      name: name,
      version: '1',
      chainId: chainId,
      verifyingContract: tokenAddress
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    };

    const message = {
      owner: walletAddress,
      spender: otherAddress,
      value: value,
      nonce: nonce,
      deadline: deadline
    };

    const signature = await wallet.signTypedData(domain, types, message);
    const { r, s, v } = ethers.Signature.from(signature);

    await expect(token.permit(walletAddress, otherAddress, value, deadline, v, r, s))
      .to.be.revertedWith('UniswapV2: EXPIRED');
  })

  it('nonces', async () => {
    let walletAddress = await wallet.getAddress();
    let otherAddress = await other.getAddress();
    expect(await token.nonces(walletAddress)).to.eq(0);
    
    const name = await token.name();
    const tokenAddress = await token.getAddress();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const deadline = ethers.MaxUint256;
    const value = TEST_AMOUNT;

    const domain = {
      name: name,
      version: '1',
      chainId: chainId,
      verifyingContract: tokenAddress
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    };

    // First permit
    let nonce = await token.nonces(walletAddress);
    let message = {
      owner: walletAddress,
      spender: otherAddress,
      value: value,
      nonce: nonce,
      deadline: deadline
    };
    let signature = await wallet.signTypedData(domain, types, message);
    let { r, s, v } = ethers.Signature.from(signature);
    await token.permit(walletAddress, otherAddress, value, deadline, v, r, s);
    expect(await token.nonces(walletAddress)).to.eq(1);

    // Second permit
    nonce = await token.nonces(walletAddress);
    message = {
      owner: walletAddress,
      spender: otherAddress,
      value: value * 2n,
      nonce: nonce,
      deadline: deadline
    };
    signature = await wallet.signTypedData(domain, types, message);
    ({ r, s, v } = ethers.Signature.from(signature));
    await token.permit(walletAddress, otherAddress, value * 2n, deadline, v, r, s);
    expect(await token.nonces(walletAddress)).to.eq(2);
  })

})