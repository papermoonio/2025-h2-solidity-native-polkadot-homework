import { useState, useEffect, useCallback } from 'react'
import { Contract, ethers } from 'ethers'
import type { MintRecord } from '../types'
import './MintHistory.css'

interface MintHistoryProps {
  contract: Contract | null
  account: string | null
}

export function MintHistory({ contract, account }: MintHistoryProps) {
  const [mintRecords, setMintRecords] = useState<MintRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [lastMintTime, setLastMintTime] = useState<number | null>(null)

  const loadMintHistory = useCallback(async (): Promise<void> => {
    if (!contract || !account) return

    setLoading(true)
    try {
      // Get last mint time from the contract
      const lastMint = await contract.lastMintTime(account) as Promise<bigint>
      setLastMintTime(Number(lastMint))

      // Get Transfer events where the account received tokens (minting)
      // We filter for transfers from the zero address (minting) to the account
      const filter = contract.filters.Transfer(null, account)
      const events = await contract.queryFilter(filter)

      const records: MintRecord[] = events
        .filter(event => {
          // Only include transfers from zero address (minting)
          if ('args' in event && event.args) {
            const from = event.args.from as string
            return from === '0x0000000000000000000000000000000000000000'
          }
          return false
        })
        .map(event => {
          const block = event.blockNumber
          // Get timestamp from block (we'll need to fetch it)
          const args = 'args' in event ? event.args : null
          return {
            to: args?.to as string || '',
            amount: args?.value ? ethers.formatEther(args.value as bigint) : '0',
            timestamp: 0, // Will be set below
            blockNumber: block,
            transactionHash: event.transactionHash
          }
        })

      // Fetch block timestamps for all records
      const provider = contract.provider || (contract.runner as { provider?: { getBlock: (block: number) => Promise<{ number: number; timestamp: number | null }> } })?.provider
      if (provider && 'getBlock' in provider) {
        const blockNumbers = [...new Set(records.map(r => r.blockNumber))]
        const blocks = await Promise.all(
          blockNumbers.map(blockNum => (provider as { getBlock: (block: number) => Promise<{ number: number; timestamp: number | null }> }).getBlock(blockNum))
        )
        const blockMap = new Map(blocks.map((b: { number: number; timestamp: number | null }) => [b?.number, b?.timestamp]))
        
        records.forEach(record => {
          const block = blockMap.get(record.blockNumber)
          if (block) {
            record.timestamp = Number(block)
          }
        })
      }

      // Sort by timestamp (newest first)
      records.sort((a, b) => b.timestamp - a.timestamp)
      setMintRecords(records)
    } catch (error) {
      console.error('Error loading mint history:', error)
    } finally {
      setLoading(false)
    }
  }, [contract, account])

  useEffect(() => {
    if (contract && account) {
      loadMintHistory()
      
      // Listen for new Transfer events (minting)
      const filter = contract.filters.Transfer(null, account)
      const handleTransferEvent = (...args: unknown[]) => {
        // Transfer event args: [from, to, value]
        const from = args[0] as string
        const to = args[1] as string
        // Only reload if it's a mint (from zero address)
        if (from === '0x0000000000000000000000000000000000000000' && to.toLowerCase() === account.toLowerCase()) {
          loadMintHistory()
        }
      }
      
      contract.on(filter, handleTransferEvent)

      return () => {
        contract.off(filter, handleTransferEvent)
      }
    }
  }, [contract, account, loadMintHistory])

  const formatDate = (timestamp: number | null): string => {
    if (!timestamp || timestamp === 0) return 'Never'
    const date = new Date(timestamp * 1000)
    return date.toLocaleString()
  }

  if (loading) {
    return (
      <div className="mint-history card">
        <h2>Mint History</h2>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="mint-history card">
      <h2>Mint History</h2>
      <div className="history-content">
        {account && (
          <div className="last-mint-info">
            <span className="label">Last Mint Time:</span>
            <span className="value">{formatDate(lastMintTime)}</span>
          </div>
        )}

        {mintRecords.length === 0 ? (
          <div className="no-records">
            <p>No mint records found</p>
            <p className="hint">Mint your first token to see it here!</p>
          </div>
        ) : (
          <div className="records-list">
            {mintRecords.map((record, index) => (
              <div key={index} className="record-item">
                <div className="record-header">
                  <span className="record-amount">+{parseFloat(record.amount).toFixed(4)} MINT</span>
                  <span className="record-date">{formatDate(record.timestamp)}</span>
                </div>
                <div className="record-details">
                  <span className="record-tx">
                    TX: {record.transactionHash.slice(0, 10)}...{record.transactionHash.slice(-8)}
                  </span>
                  <span className="record-block">Block: {record.blockNumber.toString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

