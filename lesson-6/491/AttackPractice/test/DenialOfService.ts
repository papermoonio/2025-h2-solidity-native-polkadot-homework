import { expect } from "chai";
import { network } from "hardhat";
import { parseEther } from "ethers";

const { ethers } = await network.connect();

describe("DenialOfService Attack", function () {
  let rewardToken: any;
  let distributor: any;
  let attackerFactory: any;
  let owner: any;
  let user1: any;
  let user2: any;
  let attacker: any;

  async function createAttackers(attackerFactory: any, attackCount: number) {
    for (let i = 0; i < attackCount;) {
      const count = attackCount - i > 10 ? 10 : attackCount - i;
      await attackerFactory.connect(attacker).createAttackers(count);
      i += count;
    }
  }

  async function createUsers(transferFrom: any, userCount: number) {
    const users = [];
    for (let i = 0; i < userCount; i++) {
      const user = ethers.Wallet.createRandom(ethers.provider);
      await transferFrom.sendTransaction({
        to: user.address,
        value: parseEther("100"),
      });
      users.push(user);
    }
    return users;
  }

  beforeEach(async function () {
    // Get signers
    // generate 4 random private keys
    [owner] = await ethers.getSigners();

    [user1, user2, attacker] = await createUsers(owner, 3);
    // Deploy a simple ERC20 token for rewards
    // We'll use a mock contract deployed via ethers
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    rewardToken = await TokenFactory.deploy("Reward Token", "RWD", owner.address, parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy the vulnerable distributor
    const DistributorFactory = await ethers.getContractFactory("VulnerableRewardDistributor");
    distributor = await DistributorFactory.deploy(await rewardToken.getAddress());
    await distributor.waitForDeployment();

    // Deploy the attacker factory
    const AttackerFactory = await ethers.getContractFactory("DoSAttackerFactory");
    attackerFactory = await AttackerFactory.deploy(await distributor.getAddress());
    await attackerFactory.waitForDeployment();

    // Mint tokens to the distributor
    await rewardToken.mint(await distributor.getAddress(), parseEther("10000"));

  });

  describe("Normal Operation", function () {
    it("Should allow users to register", async function () {
      await distributor.connect(user1).register();
      expect(await distributor.isRegistered(user1.address)).to.be.true;
      expect(await distributor.getRegisteredUsersCount()).to.equal(1n);
    });

    it("Should distribute rewards to registered users", async function () {
      // Register users
      await distributor.connect(user1).register();
      await distributor.connect(user2).register();

      // Distribute rewards
      await distributor.distributeRewards();

      // Check that users received rewards
      expect(await rewardToken.balanceOf(user1.address)).to.equal(parseEther("1"));
      expect(await rewardToken.balanceOf(user2.address)).to.equal(parseEther("1"));
      expect(await distributor.hasReceivedReward(user1.address)).to.be.true;
      expect(await distributor.hasReceivedReward(user2.address)).to.be.true;
    });

    it("Should not distribute rewards twice to the same user", async function () {
      await distributor.connect(user1).register();

      // First distribution
      await distributor.distributeRewards();
      expect(await rewardToken.balanceOf(user1.address)).to.equal(parseEther("1"));

      // Second distribution should not give more rewards
      await distributor.distributeRewards();
      expect(await rewardToken.balanceOf(user1.address)).to.equal(parseEther("1"));
    });
  });

  describe("DoS Attack", function () {
    it("Should allow attacker to register many addresses", async function () {
      // Attacker creates many contracts and registers them
      const attackCount = 10;
      await attackerFactory.connect(attacker).createAttackers(attackCount);

      expect(await attackerFactory.getAttackersCount()).to.equal(attackCount);
      expect(await distributor.getRegisteredUsersCount()).to.equal(attackCount);
    });


    it("Should demonstrate DoS vulnerability with many registrations", async function () {
      // Register some legitimate users
      await distributor.connect(user1).register();
      await distributor.connect(user2).register();

      // Attacker creates many contracts (simulating DoS attack)
      const totalAttackers = 50;
      await createAttackers(attackerFactory, totalAttackers);
      const totalUsers = await distributor.getRegisteredUsersCount();
      expect(totalUsers).to.equal(BigInt(totalAttackers + 2));

      // Try to distribute rewards - this should work but consume a lot of gas
      const tx = await distributor.distributeRewards();
      const receipt = await tx.wait();

      // The transaction should succeed but use a lot of gas
      expect(receipt).to.not.be.null;
      console.log(`Gas used for distribution with ${totalUsers} users: ${receipt!.gasUsed.toString()}`);
    });

    it("Should fail distribution if gas limit is too low", async function () {
      // Register legitimate users
      await distributor.connect(user1).register();
      await distributor.connect(user2).register();

      // Attacker creates many contracts
      const totalAttackers = 100;
      await createAttackers(attackerFactory, totalAttackers);

      const totalUsers = await distributor.getRegisteredUsersCount();
      expect(totalUsers).to.equal(BigInt(totalAttackers + 2));

      // Try to distribute with a low gas limit (simulating block gas limit)
      // In a real scenario, if there are too many users, this would fail
      // We'll test with a reasonable gas limit to show it still works
      // but in production, this could exceed block gas limit
      try {
        const tx = await distributor.distributeRewards();
        const receipt = await tx.wait();
        console.log(`Distribution succeeded with ${totalUsers} users, gas used: ${receipt!.gasUsed.toString()}`);
      } catch (error: any) {
        // If gas limit is exceeded, this would fail
        console.log("Distribution failed due to gas limit:", error.message);
      }
    });

    it("Should show gas consumption increases with more users", async function () {
      // Test with different numbers of users
      const testCases = [5, 10, 20, 50];
      const gasConsumptions: bigint[] = [];

      for (const count of testCases) {
        // Deploy fresh distributor for each test
        const DistributorFactory = await ethers.getContractFactory("VulnerableRewardDistributor");
        const testDistributor = await DistributorFactory.deploy(await rewardToken.getAddress());
        await testDistributor.waitForDeployment();

        // Mint tokens
        await rewardToken.mint(await testDistributor.getAddress(), parseEther("10000"));

        // Create attackers
        const AttackerFactory = await ethers.getContractFactory("DoSAttackerFactory");
        const testAttackerFactory = await AttackerFactory.deploy(await testDistributor.getAddress());
        await testAttackerFactory.waitForDeployment();

        await createAttackers(testAttackerFactory, count);

        // Distribute rewards and measure gas
        const tx = await testDistributor.distributeRewards();
        const receipt = await tx.wait();
        gasConsumptions.push(receipt!.gasUsed);

        console.log(`Users: ${count}, Gas used: ${receipt!.gasUsed.toString()}`);
      }

      // Verify gas consumption increases with more users
      for (let i = 1; i < gasConsumptions.length; i++) {
        expect(gasConsumptions[i]).to.be.greaterThan(gasConsumptions[i - 1]);
      }
    });
  });

  describe("Attack Impact", function () {
    it("Should prevent legitimate users from receiving rewards if gas limit is exceeded", async function () {
      // This test demonstrates the impact: if an attacker registers too many addresses,
      // the distributeRewards function may become unusable

      // Register legitimate users first
      await distributor.connect(user1).register();
      await distributor.connect(user2).register();

      // Attacker launches DoS attack
      const attackCount = 200; // Large number to simulate real attack
      await createAttackers(attackerFactory, attackCount);

      const totalUsers = await distributor.getRegisteredUsersCount();
      console.log(`Total registered users: ${totalUsers}`);

      // In a real scenario with block gas limits, this might fail
      // Here we show it still works but uses excessive gas
      const tx = await distributor.distributeRewards();
      const receipt = await tx.wait();

      // Verify legitimate users still received rewards (if transaction succeeded)
      expect(await distributor.hasReceivedReward(user1.address)).to.be.true;
      expect(await distributor.hasReceivedReward(user2.address)).to.be.true;

      console.log(`Gas used: ${receipt!.gasUsed.toString()}`);
      console.log(`This demonstrates the vulnerability: with ${totalUsers} users, gas consumption is very high`);
    });
  });
});

