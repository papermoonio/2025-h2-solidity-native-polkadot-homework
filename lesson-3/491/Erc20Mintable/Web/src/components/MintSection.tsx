import { useState, useEffect } from 'react'
import { Contract } from 'ethers'
import './MintSection.css'

interface MintSectionProps {
  contract: Contract | null
  account: string | null
}

interface ErrorWithReason extends Error {
  reason?: string
}

export function MintSection({ contract, account }: MintSectionProps) {
  const [canMint, setCanMint] = useState<boolean>(false)
  const [timeUntilNext, setTimeUntilNext] = useState<number>(0)
  const [isMinting, setIsMinting] = useState<boolean>(false)
  const [mintStatus, setMintStatus] = useState<string>('')

  useEffect(() => {
    if (contract && account) {
      checkMintStatus()
      let retryCount = 0;
      const interval = setInterval(() => {
        checkMintStatus()
        if (retryCount++ > 1) {
          clearInterval(interval)
        }
      }, 1000) // Update every second
      return () => clearInterval(interval)
    }
  }, [contract, account])

  const checkMintStatus = async (): Promise<void> => {
    if (!contract || !account) return

    try {
      const [canMintNow, lastMintTime, interval] = await Promise.all([
        contract.canMint(account) as Promise<boolean>,
        contract.lastMintTime(account) as Promise<bigint>,
        contract.interval() as Promise<bigint>
      ])

      setCanMint(canMintNow)
      
      // Calculate time until next mint
      if (canMintNow) {
        setTimeUntilNext(0)
      } else {
        const lastMint = Number(lastMintTime)
        const intervalSeconds = Number(interval)
        const currentTime = Math.floor(Date.now() / 1000)
        const nextMintTime = lastMint + intervalSeconds
        const remaining = Math.max(0, nextMintTime - currentTime)
        setTimeUntilNext(remaining)
      }
    } catch (error) {
      console.error('Error checking mint status:', error)
    }
  }

  const handleMint = async (): Promise<void> => {
    if (!contract || !account || !canMint) return

    setIsMinting(true)
    setMintStatus('')

    try {
      const tx = await contract.mintToken()
      setMintStatus('Transaction sent, waiting for confirmation...')
      
      await tx.wait()
      setMintStatus('Successfully minted 100 tokens!')
      
      // Refresh status after a short delay
      setTimeout(() => {
        checkMintStatus()
      }, 2000)
    } catch (error) {
      console.error('Error minting:', error)
      const err = error as ErrorWithReason
      if (err.reason) {
        setMintStatus(`Error: ${err.reason}`)
      } else {
        setMintStatus('Error: Failed to mint token')
      }
    } finally {
      setIsMinting(false)
    }
  }

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return 'Ready to mint!'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}h ${minutes}m ${secs}s`
  }

  return (
    <div className="mint-section card">
      <h2>Mint Tokens</h2>
      <div className="mint-content">
        <div className="mint-status">
          {canMint ? (
            <div className="status-ready">
              <span className="status-icon">✓</span>
              <span>You can mint now!</span>
            </div>
          ) : (
            <div className="status-waiting">
              <span className="status-icon">⏱</span>
              <span>Time until next mint: {formatTime(timeUntilNext)}</span>
            </div>
          )}
        </div>

        <button
          onClick={handleMint}
          disabled={!canMint || isMinting}
          className="mint-button"
        >
          {isMinting ? 'Minting...' : 'Mint 100 Tokens'}
        </button>

        {mintStatus && (
          <div className={`mint-message ${mintStatus.includes('Error') ? 'error' : 'success'}`}>
            {mintStatus}
          </div>
        )}

        <div className="mint-info">
          <p>• Each mint gives you exactly 100 tokens</p>
          <p>• You can mint once per hour (or as configured by owner)</p>
          <p>• Minting requires a small gas fee</p>
        </div>
      </div>
    </div>
  )
}

