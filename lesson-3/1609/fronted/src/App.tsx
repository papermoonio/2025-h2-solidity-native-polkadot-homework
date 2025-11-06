import React, { useEffect, useMemo, useState } from 'react'
import { createWalletClient, createPublicClient, custom, http, getContract, formatEther, parseEther } from 'viem'
import { defineChain } from 'viem'

const CONTRACT_ADDRESS = (import.meta as any).env.VITE_CONTRACT_ADDRESS as string
const TARGET_CHAIN_ID = Number((import.meta as any).env.VITE_CHAIN_ID || '420420422')
const TARGET_RPC_URL = (import.meta as any).env.VITE_RPC_URL as string | undefined

const targetChain = defineChain({
    id: TARGET_CHAIN_ID,
    name: 'TargetChain',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: [TARGET_RPC_URL || 'http://127.0.0.1:8545'] },
        public: { http: [TARGET_RPC_URL || 'http://127.0.0.1:8545'] },
    }
})

const abi = [
    { "type": "function", "name": "name", "stateMutability": "view", "inputs": [], "outputs": [{ "name": "", "type": "string" }] },
    { "type": "function", "name": "symbol", "stateMutability": "view", "inputs": [], "outputs": [{ "name": "", "type": "string" }] },
    { "type": "function", "name": "decimals", "stateMutability": "view", "inputs": [], "outputs": [{ "name": "", "type": "uint8" }] },
    { "type": "function", "name": "totalSupply", "stateMutability": "view", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
    { "type": "function", "name": "balanceOf", "stateMutability": "view", "inputs": [{ "name": "account", "type": "address" }], "outputs": [{ "name": "", "type": "uint256" }] },
    { "type": "function", "name": "mintToken", "stateMutability": "nonpayable", "inputs": [], "outputs": [] },
    { "type": "function", "name": "ownerMint", "stateMutability": "nonpayable", "inputs": [{ "name": "_target", "type": "address" }, { "name": "_amount", "type": "uint256" }], "outputs": [] },
    { "type": "function", "name": "canMint", "stateMutability": "view", "inputs": [{ "name": "_address", "type": "address" }], "outputs": [{ "name": "", "type": "bool" }] },
    { "type": "function", "name": "lastMintTime", "stateMutability": "view", "inputs": [{ "name": "", "type": "address" }], "outputs": [{ "name": "", "type": "uint256" }] },
    { "type": "function", "name": "setInterval", "stateMutability": "nonpayable", "inputs": [{ "name": "_newInterval", "type": "uint256" }], "outputs": [] },
    { "type": "function", "name": "owner", "stateMutability": "view", "inputs": [], "outputs": [{ "name": "", "type": "address" }] },
]

export default function App() {
    const [account, setAccount] = useState<`0x${string}` | null>(null)
    const [chainId, setChainId] = useState<number | null>(null)
    const [name, setName] = useState('')
    const [symbol, setSymbol] = useState('')
    const [totalSupply, setTotalSupply] = useState('0')
    const [balance, setBalance] = useState('0')
    const [canMint, setCanMint] = useState<boolean>(false)
    const [owner, setOwner] = useState<`0x${string}` | null>(null)
    const [ownerMintTo, setOwnerMintTo] = useState('')
    const [ownerMintAmount, setOwnerMintAmount] = useState('100')
    const [intervalInput, setIntervalInput] = useState('3600')
    const [lastMintAt, setLastMintAt] = useState<number | null>(null)

    const walletClient = useMemo(() => {
        if (typeof window === 'undefined' || !(window as any).ethereum) return null
        return createWalletClient({
            chain: targetChain,
            transport: custom((window as any).ethereum)
        })
    }, [])

    const publicClient = useMemo(() => {
        return createPublicClient({ chain: targetChain, transport: http(targetChain.rpcUrls.default.http[0]) })
    }, [])

    const contract = useMemo(() => {
        if (!walletClient || !CONTRACT_ADDRESS) return null
        return getContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi,
            client: { wallet: walletClient, public: publicClient },
        })
    }, [walletClient])

    useEffect(() => {
        const init = async () => {
            if (!walletClient) return
            try {
                const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
                setAccount(accounts[0] as `0x${string}`)
                const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' })
                setChainId(parseInt(chainIdHex, 16))
            } catch (e) { }
        }
        init()
    }, [walletClient])

    // 监听钱包事件
    useEffect(() => {
        const eth = (window as any).ethereum
        if (!eth) return
        const onAccounts = (accs: string[]) => {
            setAccount((accs && accs[0]) ? (accs[0] as `0x${string}`) : null)
        }
        const onChain = (cid: string) => setChainId(parseInt(cid, 16))
        eth.on?.('accountsChanged', onAccounts)
        eth.on?.('chainChanged', onChain)
        return () => {
            eth.removeListener?.('accountsChanged', onAccounts)
            eth.removeListener?.('chainChanged', onChain)
        }
    }, [])

    const refresh = async () => {
        if (!contract || !account) return
        const [n, s, ts, bal, cm, own, lmt] = await Promise.all([
            contract.read.name(),
            contract.read.symbol(),
            contract.read.totalSupply(),
            contract.read.balanceOf([account]),
            contract.read.canMint([account]),
            contract.read.owner(),
            contract.read.lastMintTime([account]),
        ])
        setName(n as string)
        setSymbol(s as string)
        setTotalSupply(formatEther(ts as bigint))
        setBalance(formatEther(bal as bigint))
        setCanMint(cm as boolean)
        setOwner(own as `0x${string}`)
        setLastMintAt(Number(lmt))
    }

    useEffect(() => {
        refresh()
            .catch(() => { })
    }, [contract, account])

    const handleMint = async () => {
        if (!contract || !account || chainId !== TARGET_CHAIN_ID) return
        const hash = await contract.write.mintToken({ account })
        await (window as any).ethereum.request({ method: 'eth_waitForTransactionReceipt', params: [{ hash }] })
        await refresh()
    }

    const handleOwnerMint = async () => {
        if (!contract || !owner || !account || owner.toLowerCase() !== (account || '').toLowerCase() || chainId !== TARGET_CHAIN_ID) return
        if (!ownerMintTo) return
        const amt = parseEther(ownerMintAmount || '0')
        const hash = await contract.write.ownerMint([ownerMintTo as `0x${string}`, amt], { account })
        await (window as any).ethereum.request({ method: 'eth_waitForTransactionReceipt', params: [{ hash }] })
        await refresh()
    }

    const handleSetInterval = async () => {
        if (!contract || !owner || !account || owner.toLowerCase() !== (account || '').toLowerCase() || chainId !== TARGET_CHAIN_ID) return
        const secs = BigInt(Number(intervalInput || '0'))
        const hash = await contract.write.setInterval([secs], { account })
        await (window as any).ethereum.request({ method: 'eth_waitForTransactionReceipt', params: [{ hash }] })
        await refresh()
    }

    const now = Math.floor(Date.now() / 1000)
    const waitHint = lastMintAt ? Math.max(0, (lastMintAt + Number(intervalInput || '3600')) - now) : 0

    const handleConnect = async () => {
        try {
            const accs = await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
            setAccount(accs[0] as `0x${string}`)
            const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' })
            setChainId(parseInt(chainIdHex, 16))
        } catch { }
    }

    const handleDisconnect = async () => {
        // 大多数钱包不支持程序化断开，这里仅清空本地状态，达到“断开”的效果
        setAccount(null)
        setChainId(null)
    }

    const handleSwitchAccount = async () => {
        try {
            await (window as any).ethereum.request({
                method: 'wallet_requestPermissions',
                params: [{ eth_accounts: {} }]
            })
            const accs = await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
            setAccount(accs[0] as `0x${string}`)
        } catch { }
    }

    const toHexChainId = (id: number) => '0x' + id.toString(16)
    const handleSwitchNetwork = async () => {
        const chainHex = toHexChainId(TARGET_CHAIN_ID)
        try {
            await (window as any).ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: chainHex }]
            })
        } catch (err: any) {
            const needAdd = err?.code === 4902 || err?.data?.originalError?.code === 4902
            if (needAdd) {
                try {
                    await (window as any).ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: chainHex,
                            chainName: 'TargetChain',
                            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                            rpcUrls: [targetChain.rpcUrls.default.http[0]],
                        }]
                    })
                    await (window as any).ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: chainHex }]
                    })
                } catch { }
            }
        }
    }

    return (
        <div className="wrap">
            <div className="nav">
                <div className="brand">
                    <div className="logo" /> MintableERC20
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div className={`badge ${account ? 'ok' : 'warn'}`}>
                        {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : '未连接'}
                    </div>
                    {account ? (
                        <>
                            <button className="btn secondary" onClick={handleSwitchAccount}>切换账户</button>
                            <button className="btn secondary" onClick={handleDisconnect}>断开连接</button>
                        </>
                    ) : (
                        <button className="btn" onClick={handleConnect}>连接钱包</button>
                    )}
                    <button className="btn secondary" onClick={handleSwitchNetwork}>切换到目标网络</button>
                </div>
            </div>

            <div className="card" style={{ marginTop: 12 }}>
                <h3>代币信息</h3>
                <div className="rows">
                    <div className="row"><span className="k">名称</span><span className="v">{name || '-'}</span></div>
                    <div className="row"><span className="k">符号</span><span className="v">{symbol || '-'}</span></div>
                    <div className="row"><span className="k">总供应量</span><span className="v">{totalSupply}</span></div>
                    <div className="row"><span className="k">我的余额</span><span className="v">{balance}</span></div>
                    <div className="row"><span className="k">可免费铸造</span><span className="v">{canMint ? '是' : '否'}</span></div>
                    {lastMintAt ? <div className="row"><span className="k">上次铸造</span><span className="v">{new Date(lastMintAt * 1000).toLocaleString()}</span></div> : null}
                </div>
                <div className="hr" />
                <div className="btns">
                    <button className="btn secondary" onClick={refresh}>刷新</button>
                    <button className="btn" onClick={handleMint} disabled={!canMint || !account || chainId !== TARGET_CHAIN_ID}>免费铸造 100</button>
                </div>
            </div>

            <div className="note" style={{ marginTop: 12 }}>
                每个地址可按设定间隔免费铸造固定数量的代币，适用于水龙头、增长激励等场景。 支持 Owner 快速增发与动态调整冷却时间，前端基于 React + viem 构建。
            </div>

            {chainId !== null && chainId !== TARGET_CHAIN_ID ? (
                <div className="note">当前钱包网络为 {chainId}，目标网络为 {TARGET_CHAIN_ID}。请在钱包中切换到目标网络后再进行写操作。</div>
            ) : null}

            <div className="grid">

                {owner && account && owner.toLowerCase() === account.toLowerCase() ? (
                    <div className="card">
                        <h3>Owner 面板</h3>
                        <div className="ownerGrid">
                            <div>
                                <div className="muted" style={{ marginBottom: 6 }}>铸造给地址</div>
                                <input className="input" value={ownerMintTo} onChange={e => setOwnerMintTo(e.target.value)} placeholder="0x..." />
                            </div>
                            <div className="ownerRow">
                                <div>
                                    <div className="muted" style={{ marginBottom: 6 }}>数量（代币）</div>
                                    <input className="input" value={ownerMintAmount} onChange={e => setOwnerMintAmount(e.target.value)} />
                                </div>
                                <div style={{ alignSelf: 'end' }}>
                                    <button className="btn" onClick={handleOwnerMint} disabled={!account || chainId !== TARGET_CHAIN_ID}>Owner 铸造</button>
                                </div>
                            </div>
                            <div className="ownerRow">
                                <div>
                                    <div className="muted" style={{ marginBottom: 6 }}>铸造冷却间隔（秒）</div>
                                    <input className="input" value={intervalInput} onChange={e => setIntervalInput(e.target.value)} />
                                </div>
                                <div style={{ alignSelf: 'end' }}>
                                    <button className="btn secondary" onClick={handleSetInterval} disabled={!account || chainId !== TARGET_CHAIN_ID}>设置间隔</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {!canMint && waitHint > 0 ? (
                <div className="note">距离下次可铸造约 {waitHint} 秒</div>
            ) : null}
        </div>
    )
}


