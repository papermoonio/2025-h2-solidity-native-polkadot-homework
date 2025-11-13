import { expect } from "chai";
import hre from "hardhat";
import { Library, Caller, Library__factory, Caller__factory } from "../typechain-types";

describe("Call vs DelegateCall", function () {
    let library: Library;
    let caller: Caller;
    let libraryAddress: string;

    beforeEach(async function () {
        const [signer] = await hre.ethers.getSigners();

        // Deploy Library contract
        const LibraryFactory = await hre.ethers.getContractFactory("Library");
        const libraryDeployment = await LibraryFactory.deploy();
        await libraryDeployment.waitForDeployment();
        libraryAddress = await libraryDeployment.getAddress();
        library = Library__factory.connect(libraryAddress, signer);

        // Deploy Caller contract with Library address
        const CallerFactory = await hre.ethers.getContractFactory("Caller");
        const callerDeployment = await CallerFactory.deploy(libraryAddress);
        await callerDeployment.waitForDeployment();
        const callerAddress = await callerDeployment.getAddress();
        caller = Caller__factory.connect(callerAddress, signer);
    });

    describe("Initial State", function () {
        it("Should initialize both contracts with value 0", async function () {
            expect(await library.getValue()).to.equal(0);
            expect(await caller.getCallerValue()).to.equal(0);
            expect(await caller.getLibraryValue()).to.equal(0);
        });
    });

    describe("Call Behavior", function () {
        it("Should modify Library's storage when using call", async function () {
            const testValue = 42;

            // Execute call
            const tx = await caller.executeCall(testValue);
            await tx.wait();

            // After call: Library's storage should be modified
            expect(await library.getValue()).to.equal(testValue);
            expect(await caller.getLibraryValue()).to.equal(testValue);

            // Caller's storage should NOT be modified
            expect(await caller.getCallerValue()).to.equal(0);
        });

        it("Should emit CallExecuted event with correct values", async function () {
            const testValue = 100;

            await expect(caller.executeCall(testValue))
                .to.emit(caller, "CallExecuted")
                .withArgs(testValue, 0); // libraryValue changed, callerValue unchanged
        });

        it("Should allow multiple calls, each modifying Library's storage", async function () {
            await caller.executeCall(10);
            expect(await library.getValue()).to.equal(10);
            expect(await caller.getCallerValue()).to.equal(0);

            await caller.executeCall(20);
            expect(await library.getValue()).to.equal(20);
            expect(await caller.getCallerValue()).to.equal(0);

            await caller.executeCall(30);
            expect(await library.getValue()).to.equal(30);
            expect(await caller.getCallerValue()).to.equal(0);
        });
    });

    describe("DelegateCall Behavior", function () {
        it("Should modify Caller's storage when using delegatecall", async function () {
            const testValue = 42;

            // Execute delegatecall
            const tx = await caller.executeDelegateCall(testValue);
            await tx.wait();

            // After delegatecall: Caller's storage should be modified
            // This happens because delegatecall uses Caller's storage context
            expect(await caller.getCallerValue()).to.equal(testValue);

            // Library's storage should NOT be modified
            expect(await library.getValue()).to.equal(0);
            expect(await caller.getLibraryValue()).to.equal(0);
        });

        it("Should emit DelegateCallExecuted event with correct values", async function () {
            const testValue = 100;

            await expect(caller.executeDelegateCall(testValue))
                .to.emit(caller, "DelegateCallExecuted")
                .withArgs(0, testValue); // libraryValue unchanged, callerValue changed
        });

        it("Should allow multiple delegatecalls, each modifying Caller's storage", async function () {
            await caller.executeDelegateCall(10);
            expect(await caller.getCallerValue()).to.equal(10);
            expect(await library.getValue()).to.equal(0);

            await caller.executeDelegateCall(20);
            expect(await caller.getCallerValue()).to.equal(20);
            expect(await library.getValue()).to.equal(0);

            await caller.executeDelegateCall(30);
            expect(await caller.getCallerValue()).to.equal(30);
            expect(await library.getValue()).to.equal(0);
        });
    });

    describe("Comparison: Call vs DelegateCall", function () {
        it("Should demonstrate the key difference: storage context", async function () {
            const callValue = 100;
            const delegateCallValue = 200;

            // First, use call - modifies Library's storage
            await caller.executeCall(callValue);
            expect(await library.getValue()).to.equal(callValue);
            expect(await caller.getCallerValue()).to.equal(0);

            // Then, use delegatecall - modifies Caller's storage
            await caller.executeDelegateCall(delegateCallValue);
            expect(await caller.getCallerValue()).to.equal(delegateCallValue);
            // Library's value should still be from the previous call
            expect(await library.getValue()).to.equal(callValue);
        });

        it("Should show that both methods can be used independently", async function () {
            // Use delegatecall first
            await caller.executeDelegateCall(50);
            expect(await caller.getCallerValue()).to.equal(50);
            expect(await library.getValue()).to.equal(0);

            // Then use call
            await caller.executeCall(75);
            expect(await library.getValue()).to.equal(75);
            // Caller's value should still be from delegatecall
            expect(await caller.getCallerValue()).to.equal(50);
        });

        it("Should demonstrate storage isolation between contracts", async function () {
            // Create a second Caller instance to show isolation
            const CallerFactory = await hre.ethers.getContractFactory("Caller");
            const caller2 = await CallerFactory.deploy(libraryAddress);
            await caller2.waitForDeployment();

            // Use call from caller1 - modifies shared Library storage
            await caller.executeCall(100);
            expect(await library.getValue()).to.equal(100);
            expect(await caller2.getLibraryValue()).to.equal(100); // Both see the same Library

            // Use delegatecall from caller2 - modifies caller2's own storage
            await caller2.executeDelegateCall(200);
            expect(await caller2.getCallerValue()).to.equal(200);
            expect(await caller.getCallerValue()).to.equal(0); // caller1's storage unchanged
            expect(await library.getValue()).to.equal(100); // Library unchanged
        });
    });

    describe("Edge Cases", function () {
        it("Should handle zero value correctly", async function () {
            // Set initial value
            await caller.executeCall(100);
            await caller.executeDelegateCall(100);

            // Set to zero using call
            await caller.executeCall(0);
            expect(await library.getValue()).to.equal(0);
            expect(await caller.getCallerValue()).to.equal(100); // Unchanged

            // Set to zero using delegatecall
            await caller.executeDelegateCall(0);
            expect(await caller.getCallerValue()).to.equal(0);
            expect(await library.getValue()).to.equal(0); // Unchanged
        });

        it("Should handle large values correctly", async function () {
            const largeValue = hre.ethers.MaxUint256;

            await caller.executeCall(largeValue);
            expect(await library.getValue()).to.equal(largeValue);

            await caller.executeDelegateCall(largeValue);
            expect(await caller.getCallerValue()).to.equal(largeValue);
        });
    });
});

