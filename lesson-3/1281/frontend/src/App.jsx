import React, { useMemo, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import abiJson from './abi/MyERC20.json'
const abi = abiJson.abi

// Hardhat default local deployed address from your deploy logs
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'

export default function App() {
  const { address, isConnected } = useAccount()

  // Read token meta
  const { data: name } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'name',
  })
  const { data: symbol } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'symbol',
  })
  const { data: decimals } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'decimals',
  })

  // Balance of connected wallet
  const {
    data: balance,
    refetch: refetchBalance,
    isFetching: isBalanceFetching,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'balanceOf',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address },
  })

  const [hash, setHash] = useState()
  const { writeContractAsync, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const formattedBalance = useMemo(() => {
    if (!balance || decimals == null) return '-'
    try {
      return `${formatUnits(balance, decimals)} ${symbol ?? ''}`
    } catch {
      return '-'
    }
  }, [balance, decimals, symbol])

  const onMint = async () => {
    if (decimals == null) return
    try {
      // Mint 1000 tokens per click (respecting contract limit)
      const amount = parseUnits('1000', Number(decimals))
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'mint',
        args: [amount],
      })
      setHash(txHash)
    } catch (e) {
      console.error(e)
      alert(e?.shortMessage || e?.message || 'Mint failed')
    }
  }

  // Refresh balance after confirmation
  React.useEffect(() => {
    if (isConfirmed) {
      refetchBalance()
    }
  }, [isConfirmed, refetchBalance])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0b0f1a',
      color: '#fff',
      padding: 24,
    }}>
      <div style={{
        width: 480,
        maxWidth: '90vw',
        background: '#121b2e',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 6px 30px rgba(0,0,0,0.35)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>{name ?? 'My Token'}</h2>
          <ConnectButton />
        </div>
        <div style={{ margin: '16px 0', opacity: 0.85 }}>
          <div>合约地址: {CONTRACT_ADDRESS}</div>
          <div>符号: {symbol ?? '-'}</div>
          <div>小数位: {decimals ?? '-'}</div>
        </div>
        <div style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 8,
          background: '#0e1627'
        }}>
          <div style={{ marginBottom: 12 }}>我的余额:</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
            {isConnected ? (isBalanceFetching ? '加载中…' : formattedBalance) : '请先连接钱包'}
          </div>
          <button
            onClick={onMint}
            disabled={!isConnected || isPending || isConfirming}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: 8,
              border: 'none',
              color: '#0b0f1a',
              background: '#79ffe1',
              fontSize: 16,
              fontWeight: 700,
              cursor: (!isConnected || isPending || isConfirming) ? 'not-allowed' : 'pointer'
            }}
          >
            {isPending || isConfirming ? '铸造中…' : '铸造 1000 代币'}
          </button>
          {hash && (
            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
              Tx: {hash}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
