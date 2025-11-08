import { useState, useEffect } from 'react'
import { JsonRpcProvider } from 'ethers'
import './WalletConnection.css'

interface WalletConnectionProps {
  account: string | null
  setAccount: (account: string | null) => void
  provider: JsonRpcProvider | null
}

export function WalletConnection({ account, setAccount}: WalletConnectionProps) {
  const [isConnecting, setIsConnecting] = useState<boolean>(false)

  useEffect(() => {
    checkWalletConnection()
  }, [])

  const checkWalletConnection = async (): Promise<void> => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[]
        if (accounts.length > 0) {
          setAccount(accounts[0])
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error)
      }
    }
  }

  const connectWallet = async (): Promise<void> => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Ethereum wallet')
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      }) as string[]
      setAccount(accounts[0])
    } catch (error) {
      console.error('Error connecting wallet:', error)
      alert('Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = (): void => {
    setAccount(null)
  }

  const formatAddress = (address: string | null): string => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="wallet-connection">
      {account ? (
        <div className="wallet-info">
          <span className="wallet-address">{formatAddress(account)}</span>
          <button onClick={disconnectWallet} className="disconnect-btn">
            Disconnect
          </button>
        </div>
      ) : (
        <button 
          onClick={connectWallet} 
          className="connect-btn"
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  )
}

