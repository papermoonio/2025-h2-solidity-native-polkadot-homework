import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { network } from 'hardhat'
import { getAddress } from 'viem'

describe('ERC20', async function () {
	const { viem } = await network.connect()
	const publicClient = await viem.getPublicClient()

	const TOKEN_NAME = 'Test Token'
	const TOKEN_SYMBOL = 'TEST'
	const TOTAL_SUPPLY = 1000000n
	const INITIAL_SUPPLY = TOTAL_SUPPLY * 10n ** 18n

	it('Should set the correct token metadata on deployment', async function () {
		const erc20 = await viem.deployContract('ERC20', [
			TOKEN_NAME,
			TOKEN_SYMBOL,
			TOTAL_SUPPLY,
		])

		assert.equal(await erc20.read.name(), TOKEN_NAME)
		assert.equal(await erc20.read.symbol(), TOKEN_SYMBOL)
		assert.equal(await erc20.read.decimals(), 18)
	})

	it('Should assign the total supply to the deployer', async function () {
		const [deployer] = await viem.getWalletClients()
		const erc20 = await viem.deployContract('ERC20', [
			TOKEN_NAME,
			TOKEN_SYMBOL,
			TOTAL_SUPPLY,
		])

		const ownerBalance = await erc20.read.balanceOf([
			deployer.account.address,
		])
		const totalSupply = await erc20.read.totalSupply()

		assert.equal(ownerBalance, INITIAL_SUPPLY)
		assert.equal(totalSupply, INITIAL_SUPPLY)
	})

	it('Should emit Transfer event when transferring tokens', async function () {
		const [deployer, recipient] = await viem.getWalletClients()
		const erc20 = await viem.deployContract('ERC20', [
			TOKEN_NAME,
			TOKEN_SYMBOL,
			TOTAL_SUPPLY,
		])

		const transferAmount = 1000n * 10n ** 18n

		await viem.assertions.emitWithArgs(
			erc20.write.transfer([recipient.account.address, transferAmount]),
			erc20,
			'Transfer',
			[
				getAddress(deployer.account.address),
				getAddress(recipient.account.address),
				transferAmount,
			]
		)
	})

	it('Should update balances correctly after transfer', async function () {
		const [deployer, recipient] = await viem.getWalletClients()
		const erc20 = await viem.deployContract('ERC20', [
			TOKEN_NAME,
			TOKEN_SYMBOL,
			TOTAL_SUPPLY,
		])

		const transferAmount = 1000n * 10n ** 18n
		const initialBalance = (await erc20.read.balanceOf([
			deployer.account.address,
		])) as bigint

		await erc20.write.transfer([recipient.account.address, transferAmount])

		const finalBalance = await erc20.read.balanceOf([
			deployer.account.address,
		])
		const recipientBalance = await erc20.read.balanceOf([
			recipient.account.address,
		])

		assert.equal(finalBalance, initialBalance - transferAmount)
		assert.equal(recipientBalance, transferAmount)
	})

	it('Should emit Approval event when approving tokens', async function () {
		const [deployer, spender] = await viem.getWalletClients()
		const erc20 = await viem.deployContract('ERC20', [
			TOKEN_NAME,
			TOKEN_SYMBOL,
			TOTAL_SUPPLY,
		])

		const approveAmount = 500n * 10n ** 18n

		await viem.assertions.emitWithArgs(
			erc20.write.approve([spender.account.address, approveAmount]),
			erc20,
			'Approval',
			[
				getAddress(deployer.account.address),
				getAddress(spender.account.address),
				approveAmount,
			]
		)
	})

	it('Should allow delegated transfer with transferFrom', async function () {
		const [deployer, spender, recipient] = await viem.getWalletClients()
		const erc20 = await viem.deployContract('ERC20', [
			TOKEN_NAME,
			TOKEN_SYMBOL,
			TOTAL_SUPPLY,
		])

		const approveAmount = 1000n * 10n ** 18n
		const transferAmount = 500n * 10n ** 18n

		// Approve spender
		await erc20.write.approve([spender.account.address, approveAmount])

		// Transfer using spender
		await erc20.write.transferFrom(
			[
				deployer.account.address,
				recipient.account.address,
				transferAmount,
			],
			{ account: spender.account }
		)

		const allowance = await erc20.read.allowance([
			deployer.account.address,
			spender.account.address,
		])
		const recipientBalance = await erc20.read.balanceOf([
			recipient.account.address,
		])

		assert.equal(allowance, approveAmount - transferAmount)
		assert.equal(recipientBalance, transferAmount)
	})

	it('Should emit Transfer event when minting new tokens', async function () {
		const [deployer, recipient] = await viem.getWalletClients()
		const erc20 = await viem.deployContract('ERC20', [
			TOKEN_NAME,
			TOKEN_SYMBOL,
			TOTAL_SUPPLY,
		])

		const mintAmount = 5000n * 10n ** 18n

		await viem.assertions.emitWithArgs(
			erc20.write.mint([recipient.account.address, mintAmount]),
			erc20,
			'Transfer',
			[
				'0x0000000000000000000000000000000000000000',
				getAddress(recipient.account.address),
				mintAmount,
			]
		)
	})

	it('Should increase total supply when minting', async function () {
		const [deployer, recipient] = await viem.getWalletClients()
		const erc20 = await viem.deployContract('ERC20', [
			TOKEN_NAME,
			TOKEN_SYMBOL,
			TOTAL_SUPPLY,
		])

		const mintAmount = 5000n * 10n ** 18n
		const initialSupply = (await erc20.read.totalSupply()) as bigint

		await erc20.write.mint([recipient.account.address, mintAmount])

		const finalSupply = await erc20.read.totalSupply()
		const recipientBalance = await erc20.read.balanceOf([
			recipient.account.address,
		])

		assert.equal(finalSupply, initialSupply + mintAmount)
		assert.equal(recipientBalance, mintAmount)
	})

	it('Should emit Transfer event when burning tokens', async function () {
		const [deployer] = await viem.getWalletClients()
		const erc20 = await viem.deployContract('ERC20', [
			TOKEN_NAME,
			TOKEN_SYMBOL,
			TOTAL_SUPPLY,
		])

		const burnAmount = 1000n * 10n ** 18n

		await viem.assertions.emitWithArgs(
			erc20.write.burn([deployer.account.address, burnAmount]),
			erc20,
			'Transfer',
			[
				getAddress(deployer.account.address),
				'0x0000000000000000000000000000000000000000',
				burnAmount,
			]
		)
	})

	it('Should decrease total supply when burning', async function () {
		const [deployer] = await viem.getWalletClients()
		const erc20 = await viem.deployContract('ERC20', [
			TOKEN_NAME,
			TOKEN_SYMBOL,
			TOTAL_SUPPLY,
		])

		const burnAmount = 1000n * 10n ** 18n
		const initialSupply = (await erc20.read.totalSupply()) as bigint
		const initialBalance = (await erc20.read.balanceOf([
			deployer.account.address,
		])) as bigint

		await erc20.write.burn([deployer.account.address, burnAmount])

		const finalSupply = await erc20.read.totalSupply()
		const finalBalance = await erc20.read.balanceOf([
			deployer.account.address,
		])

		assert.equal(finalSupply, initialSupply - burnAmount)
		assert.equal(finalBalance, initialBalance - burnAmount)
	})

	it('Should aggregate Transfer events correctly', async function () {
		const [deployer, recipient1, recipient2] = await viem.getWalletClients()
		const erc20 = await viem.deployContract('ERC20', [
			TOKEN_NAME,
			TOKEN_SYMBOL,
			TOTAL_SUPPLY,
		])

		const deploymentBlockNumber = await publicClient.getBlockNumber()

		// Perform multiple transfers
		const transfers = [
			{ to: recipient1.account.address, amount: 100n * 10n ** 18n },
			{ to: recipient2.account.address, amount: 200n * 10n ** 18n },
			{ to: recipient1.account.address, amount: 300n * 10n ** 18n },
		]

		for (const transfer of transfers) {
			await erc20.write.transfer([transfer.to, transfer.amount])
		}

		// Get all Transfer events
		const events = await publicClient.getContractEvents({
			address: erc20.address,
			abi: erc20.abi,
			eventName: 'Transfer',
			fromBlock: deploymentBlockNumber,
			strict: true,
		})

		// Calculate total transferred amount (excluding mint event)
		let totalTransferred = 0n
		for (const event of events) {
			// Use type assertion for event args
			const args = event.args as { from?: string; value?: bigint }

			// Exclude the initial mint transfer (from zero address)
			if (
				args.from &&
				args.from !== '0x0000000000000000000000000000000000000000' &&
				args.value
			) {
				totalTransferred += args.value
			}
		}

		// Check that total transferred matches the balance changes
		const deployerBalance = await erc20.read.balanceOf([
			deployer.account.address,
		])
		const expectedBalance = INITIAL_SUPPLY - totalTransferred

		assert.equal(deployerBalance, expectedBalance)
	})

	it('Should fail when transferring more than balance', async function () {
		const [deployer, recipient] = await viem.getWalletClients()
		const erc20 = await viem.deployContract('ERC20', [
			TOKEN_NAME,
			TOKEN_SYMBOL,
			TOTAL_SUPPLY,
		])

		const excessiveAmount = INITIAL_SUPPLY + 1n

		await assert.rejects(async () => {
			await erc20.write.transfer([
				recipient.account.address,
				excessiveAmount,
			])
		}, Error)
	})

	it('Should fail transferFrom with insufficient allowance', async function () {
		const [deployer, spender, recipient] = await viem.getWalletClients()
		const erc20 = await viem.deployContract('ERC20', [
			TOKEN_NAME,
			TOKEN_SYMBOL,
			TOTAL_SUPPLY,
		])

		const approveAmount = 100n * 10n ** 18n
		const transferAmount = 200n * 10n ** 18n

		await erc20.write.approve([spender.account.address, approveAmount])

		await assert.rejects(async () => {
			await erc20.write.transferFrom(
				[
					deployer.account.address,
					recipient.account.address,
					transferAmount,
				],
				{ account: spender.account }
			)
		}, Error)
	})

	it('Should handle zero value transfers and approvals', async function () {
		const [deployer, recipient] = await viem.getWalletClients()
		const erc20 = await viem.deployContract('ERC20', [
			TOKEN_NAME,
			TOKEN_SYMBOL,
			TOTAL_SUPPLY,
		])

		const initialBalance = (await erc20.read.balanceOf([
			deployer.account.address,
		])) as bigint

		// Zero value transfer
		await erc20.write.transfer([recipient.account.address, 0n])

		// Zero value approval
		await erc20.write.approve([recipient.account.address, 0n])

		const finalBalance = await erc20.read.balanceOf([
			deployer.account.address,
		])
		const allowance = await erc20.read.allowance([
			deployer.account.address,
			recipient.account.address,
		])

		assert.equal(finalBalance, initialBalance)
		assert.equal(allowance, 0n)
	})

	it('Should maintain correct allowance after partial transferFrom', async function () {
		const [deployer, spender, recipient] = await viem.getWalletClients()
		const erc20 = await viem.deployContract('ERC20', [
			TOKEN_NAME,
			TOKEN_SYMBOL,
			TOTAL_SUPPLY,
		])

		const approveAmount = 1000n * 10n ** 18n
		const transferAmount1 = 300n * 10n ** 18n
		const transferAmount2 = 200n * 10n ** 18n

		await erc20.write.approve([spender.account.address, approveAmount])

		// First transfer
		await erc20.write.transferFrom(
			[
				deployer.account.address,
				recipient.account.address,
				transferAmount1,
			],
			{ account: spender.account }
		)

		// Second transfer
		await erc20.write.transferFrom(
			[
				deployer.account.address,
				recipient.account.address,
				transferAmount2,
			],
			{ account: spender.account }
		)

		const remainingAllowance = await erc20.read.allowance([
			deployer.account.address,
			spender.account.address,
		])
		const expectedAllowance =
			approveAmount - transferAmount1 - transferAmount2

		assert.equal(remainingAllowance, expectedAllowance)
	})

	it('Should handle infinite allowance correctly', async function () {
		const [deployer, spender, recipient] = await viem.getWalletClients()
		const erc20 = await viem.deployContract('ERC20', [
			TOKEN_NAME,
			TOKEN_SYMBOL,
			TOTAL_SUPPLY,
		])

		const maxUint256 = 2n ** 256n - 1n
		const transferAmount = 1000n * 10n ** 18n

		// Set infinite allowance
		await erc20.write.approve([spender.account.address, maxUint256])

		// Make multiple transfers
		await erc20.write.transferFrom(
			[
				deployer.account.address,
				recipient.account.address,
				transferAmount,
			],
			{ account: spender.account }
		)

		await erc20.write.transferFrom(
			[
				deployer.account.address,
				recipient.account.address,
				transferAmount,
			],
			{ account: spender.account }
		)

		// Allowance should remain max
		const allowance = await erc20.read.allowance([
			deployer.account.address,
			spender.account.address,
		])
		const recipientBalance = await erc20.read.balanceOf([
			recipient.account.address,
		])

		assert.equal(allowance, maxUint256)
		assert.equal(recipientBalance, transferAmount * 2n)
	})
})
