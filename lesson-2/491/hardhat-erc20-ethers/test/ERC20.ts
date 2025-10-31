import { expect } from "chai";
import { network } from "hardhat";
const {ethers}  = await network.connect();

describe("ERC20 (no OZ)", function () {
  const NAME = "SampleToken";
  const SYMBOL = "STK";
  const DECIMALS = 18;
  const INITIAL = ethers.parseUnits("100000000000000");
  const OTHER_INITIAL = ethers.parseUnits("1.0");

  let owner: any;
  let token: any;
  let address1: any;
  let address2: any;
  let address3: any;

  beforeEach(async function () {
    [owner]= await ethers.getSigners();
    address1 = await ethers.Wallet.createRandom().connect(ethers.provider);
    address2 = await ethers.Wallet.createRandom().connect(ethers.provider);;
    address3 = await ethers.Wallet.createRandom().connect(ethers.provider);;

    token = await ethers.deployContract("ERC20", [NAME, SYMBOL, DECIMALS, INITIAL]);
    await token.waitForDeployment();

    const addrsToTransfer = [address1, address2, address3]; 
  });

  async function deploy() {
    // const [deployer, alice, bob, carol] = await ethers.getSigners();
    // const ERC20 = await ethers.getContractFactory("ERC20");
    // const token = await ERC20.deploy(NAME, SYMBOL, DECIMALS, INITIAL);
    // await token.waitForDeployment();
    // return { token, deployer, alice, bob, carol };
     return { token, deployer: owner, alice: address1, bob : address2, carol: address3 };
  }

  it("has correct metadata", async () => {
    const { token } = await deploy();
    expect(await token.name()).to.equal(NAME);
    expect(await token.symbol()).to.equal(SYMBOL);
    expect(await token.decimals()).to.equal(DECIMALS);
  });

  it("mints initial supply to deployer and reports totalSupply", async () => {
    const { token, deployer } = await deploy();
    const total = await token.totalSupply();
    const bal = await token.balanceOf(deployer.address);
    expect(total).to.equal(INITIAL);
    expect(bal).to.equal(INITIAL);
  });

  it("transfer updates balances and emits Transfer", async () => {
    const { token, deployer, alice } = await deploy();
    const amount = ethers.parseUnits("25", DECIMALS);
    await expect(token.transfer(alice.address, amount))
      .to.emit(token, "Transfer")
      .withArgs(deployer.address, alice.address, amount);
    expect(await token.balanceOf(alice.address)).to.equal(amount);
    expect(await token.balanceOf(deployer.address)).to.equal(INITIAL - amount);
  });

  it("transfer reverts on insufficient balance", async () => {
    const { token, alice, bob } = await deploy();
    const amount = ethers.parseUnits("1", DECIMALS);
    await expect(token.connect(alice).transfer(bob.address, amount)).to.be.revertedWithCustomError(
      token,
      "InsufficientBalance"
    );
  });

  it("approve sets allowance and emits Approval", async () => {
    const { token, deployer, alice } = await deploy();
    const amount = ethers.parseUnits("10", DECIMALS);
    await expect(token.approve(alice.address, amount))
      .to.emit(token, "Approval")
      .withArgs(deployer.address, alice.address, amount);
    expect(await token.allowance(deployer.address, alice.address)).to.equal(amount);
  });


  it("transferFrom reverts when allowance is insufficient", async () => {
    const { token, deployer, alice, bob } = await deploy();
    await token.approve(alice.address, 1);
    await expect(
      token.connect(alice).transferFrom(deployer.address, bob.address, 2)
    ).to.be.revertedWithCustomError(token, "InsufficientAllowance");
  });

  it("increaseAllowance and decreaseAllowance work", async () => {
    const { token, deployer, alice } = await deploy();
    await token.approve(alice.address, 5);
    await token.increaseAllowance(alice.address, 10);
    expect(await token.allowance(deployer.address, alice.address)).to.equal(15n);
    await token.decreaseAllowance(alice.address, 6);
    expect(await token.allowance(deployer.address, alice.address)).to.equal(9n);
  });

  it("decreaseAllowance reverts when subtracting more than current", async () => {
    const { token, deployer, alice } = await deploy();
    await token.approve(alice.address, 3);
    await expect(token.decreaseAllowance(alice.address, 4)).to.be.revertedWithCustomError(
      token,
      "InsufficientAllowance"
    );
  });

  it("reverts on zero address transfers and approvals", async () => {
    const { token } = await deploy();
    await expect(token.transfer(ethers.ZeroAddress, 1)).to.be.revertedWithCustomError(token, "ZeroAddress");
    await expect(token.approve(ethers.ZeroAddress, 1)).to.be.revertedWithCustomError(token, "ZeroAddress");
    // transferFrom from zero or to zero not directly callable without setting states, but internal checks cover it.
  });
});


