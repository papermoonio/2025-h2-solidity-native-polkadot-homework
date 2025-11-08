import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, ContractTransactionReceipt, Contract, ContractTransactionResponse } from "ethers";

// Type definition for the contract (will be available after compilation with typechain)
interface MintableERC20Contract extends Contract {
  name(): Promise<string>;
  symbol(): Promise<string>;
  decimals(): Promise<number>;
  totalSupply(): Promise<bigint>;
  balanceOf(account: string): Promise<bigint>;
  mint(): Promise<ContractTransactionResponse>;
  canMint(account: string): Promise<boolean>;
  getLastMintTime(account: string): Promise<bigint>;
  getTimeUntilNextMint(account: string): Promise<bigint>;
  MINT_COOLDOWN(): Promise<bigint>;
  filters: {
    Mint(address?: string): unknown;
  };
}

describe("MintableERC20", function () {
  let mintableERC20: MintableERC20Contract;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const MintableERC20Factory = await ethers.getContractFactory("MintableERC20");
    const deployed = await MintableERC20Factory.deploy();
    await deployed.waitForDeployment();
    mintableERC20 = deployed as unknown as MintableERC20Contract;
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await mintableERC20.name()).to.equal("Mintable Token");
      expect(await mintableERC20.symbol()).to.equal("MINT");
    });

    it("Should have 18 decimals", async function () {
      expect(await mintableERC20.decimals()).to.equal(18);
    });

    it("Should have zero initial supply", async function () {
      expect(await mintableERC20.totalSupply()).to.equal(0n);
    });
  });

  describe("Minting", function () {
    it("Should allow anyone to mint tokens", async function () {
      await expect(mintableERC20.connect(addr1).mint())
        .to.emit(mintableERC20, "Mint")
        .withArgs(await addr1.getAddress(), ethers.parseEther("1"), (value: bigint) => {
          return typeof value === "bigint" && value > 0n;
        });

      expect(await mintableERC20.balanceOf(await addr1.getAddress())).to.equal(ethers.parseEther("1"));
      expect(await mintableERC20.totalSupply()).to.equal(ethers.parseEther("1"));
    });

    it("Should mint exactly 1 token", async function () {
      await mintableERC20.connect(addr1).mint();
      expect(await mintableERC20.balanceOf(await addr1.getAddress())).to.equal(ethers.parseEther("1"));
    });

    it("Should prevent minting within 1 hour", async function () {
      await mintableERC20.connect(addr1).mint();
      
      await expect(mintableERC20.connect(addr1).mint())
        .to.be.revertedWith("MintableERC20: Must wait at least 1 hour between mints");
    });

    it("Should allow different addresses to mint independently", async function () {
      await mintableERC20.connect(addr1).mint();
      await mintableERC20.connect(addr2).mint();

      expect(await mintableERC20.balanceOf(await addr1.getAddress())).to.equal(ethers.parseEther("1"));
      expect(await mintableERC20.balanceOf(await addr2.getAddress())).to.equal(ethers.parseEther("1"));
      expect(await mintableERC20.totalSupply()).to.equal(ethers.parseEther("2"));
    });

    it("Should allow minting after 1 hour", async function () {
      await mintableERC20.connect(addr1).mint();
      
      // Fast forward time by 1 hour + 1 second
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      await mintableERC20.connect(addr1).mint();
      expect(await mintableERC20.balanceOf(await addr1.getAddress())).to.equal(ethers.parseEther("2"));
    });
  });

  describe("View Functions", function () {
    it("Should return correct last mint time", async function () {
      const tx = await mintableERC20.connect(addr1).mint();
      const receipt: ContractTransactionReceipt | null = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt is null");
      }
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      if (!block) {
        throw new Error("Block is null");
      }

      expect(await mintableERC20.getLastMintTime(await addr1.getAddress())).to.equal(block.timestamp);
    });

    it("Should return correct time until next mint", async function () {
      await mintableERC20.connect(addr1).mint();
      
      const timeUntilNext = await mintableERC20.getTimeUntilNextMint(await addr1.getAddress());
      expect(timeUntilNext).to.be.greaterThan(0n);
      expect(timeUntilNext).to.be.lessThanOrEqual(3600n);
    });

    it("Should return 0 for time until next mint if cooldown has passed", async function () {
      await mintableERC20.connect(addr1).mint();
      
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      expect(await mintableERC20.getTimeUntilNextMint(await addr1.getAddress())).to.equal(0n);
    });

    it("Should return correct canMint status", async function () {
      expect(await mintableERC20.canMint(await addr1.getAddress())).to.be.true;
      
      await mintableERC20.connect(addr1).mint();
      expect(await mintableERC20.canMint(await addr1.getAddress())).to.be.false;

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);
      
      expect(await mintableERC20.canMint(await addr1.getAddress())).to.be.true;
    });
  });

  describe("MINT_COOLDOWN", function () {
    it("Should have correct cooldown value", async function () {
      expect(await mintableERC20.MINT_COOLDOWN()).to.equal(3600n);
    });
  });
});

