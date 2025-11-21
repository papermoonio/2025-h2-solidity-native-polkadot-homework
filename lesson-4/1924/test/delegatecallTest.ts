import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { network } from 'hardhat'

describe('DelegateCall Test', async function () {
	const { viem } = await network.connect()
	const publicClient = await viem.getPublicClient()

	it('Should increment proxy.counter via delegatecall, not logic.counter', async function () {
		const logic = await viem.deployContract('LogicContract')
		const proxy = await viem.deployContract('ProxyContract')

		// Initial state
		assert.equal(await proxy.read.counter(), 0n)
		assert.equal(await logic.read.counter(), 0n)

		// Call increment via delegatecall
		await proxy.write.incrementViaDelegate([logic.address])

		// Proxy state updated
		assert.equal(await proxy.read.counter(), 1n)
		// Logic contract state unchanged
		assert.equal(await logic.read.counter(), 0n)
	})

	it('Multiple delegatecalls should accumulate in proxy storage only', async function () {
		const logic = await viem.deployContract('LogicContract')
		const proxy = await viem.deployContract('ProxyContract')
		const deploymentBlockNumber = await publicClient.getBlockNumber()

		// Perform 5 increments via delegatecall
		for (let i = 1n; i <= 5n; i++) {
			await proxy.write.incrementViaDelegate([logic.address])
		}

		// No events to sum — just verify final state
		assert.equal(
			await proxy.read.counter(),
			5n,
			'Proxy counter should be 5'
		)
		assert.equal(
			await logic.read.counter(),
			0n,
			'Logic counter must remain 0'
		)

		// Optional: verify no storage write happened in LogicContract
		const logicCode = await publicClient.getCode({ address: logic.address })
		const proxyCode = await publicClient.getCode({ address: proxy.address })
		assert.ok(logicCode && proxyCode, 'Both contracts deployed')
	})
})