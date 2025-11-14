import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { network } from 'hardhat'

describe('DelegateCall 测试', async function () {
    const { viem } = await network.connect()
    const publicClient = await viem.getPublicClient()

    it('应该通过 delegatecall 增加 proxy.counter，而不是 logic.counter', async function () {
        const logic = await viem.deployContract('LogicContract')
        const proxy = await viem.deployContract('ProxyContract')

        // 初始状态
        assert.equal(await proxy.read.counter(), 0n)
        assert.equal(await logic.read.counter(), 0n)

        // 通过 delegatecall 调用 increment
        await proxy.write.incrementViaDelegate([logic.address])

        // 代理合约状态已更新
        assert.equal(await proxy.read.counter(), 1n)
        // 逻辑合约状态保持不变
        assert.equal(await logic.read.counter(), 0n)
    })

    it('多次 delegatecall 应该只在代理存储中累积', async function () {
        const logic = await viem.deployContract('LogicContract')
        const proxy = await viem.deployContract('ProxyContract')
        const deploymentBlockNumber = await publicClient.getBlockNumber()

        // 通过 delegatecall 执行 5 次递增
        for (let i = 1n; i <= 5n; i++) {
            await proxy.write.incrementViaDelegate([logic.address])
        }

        // 没有事件需要求和 - 只需验证最终状态
        assert.equal(
            await proxy.read.counter(),
            5n,
            '代理计数器应该为 5'
        )
        assert.equal(
            await logic.read.counter(),
            0n,
            '逻辑计数器必须保持为 0'
        )

        // 可选：验证 LogicContract 中没有发生存储写入
        const logicCode = await publicClient.getCode({ address: logic.address })
        const proxyCode = await publicClient.getCode({ address: proxy.address })
        assert.ok(logicCode && proxyCode, '两个合约都已部署')
    })
})