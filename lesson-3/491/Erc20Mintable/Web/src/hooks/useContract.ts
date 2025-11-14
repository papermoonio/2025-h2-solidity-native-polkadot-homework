import { useState, useEffect } from 'react'
import { ethers, Contract, JsonRpcProvider, Signer } from 'ethers'
import MintableERC20ABI from '../../abi/MintableERC20.json'
import type { UseContractReturn } from '../types'

const CONTRACT_ADDRESS: string = import.meta.env.VITE_CONTRACT_ADDRESS || ''

export function useContract(): UseContractReturn {
  const [contract, setContract] = useState<Contract | null>(null)
  const [provider, setProvider] = useState<JsonRpcProvider | null>(null)
  const [signer, setSigner] = useState<Signer | null>(null)

  useEffect(() => {
    // Initialize provider with proxy
    const initProvider = async (): Promise<void> => {
      try {
        // Use Vite proxy for RPC requests - proxy forwards /rpc to http://localhost:8545
        const proxyUrl = typeof window !== 'undefined' ? `${window.location.origin}/rpc` : 'http://localhost:8545'
        const customProvider = new ethers.JsonRpcProvider(proxyUrl)
        setProvider(customProvider)
      } catch (error) {
        console.error('Failed to initialize provider:', error)
      }
    }

    initProvider()
  }, [])

  const connectContract = async (account: string): Promise<void> => {
    if (!CONTRACT_ADDRESS) {
      console.error('Contract address not available. Please set VITE_CONTRACT_ADDRESS in .env file')
      return
    }

    try {
      let contractInstance: Contract
      
      // If we have window.ethereum and account, use it for signing
      if (window.ethereum && account) {
        const ethereumProvider = new ethers.BrowserProvider(window.ethereum)
        const walletSigner = await ethereumProvider.getSigner()
        setSigner(walletSigner)
        contractInstance = new ethers.Contract(
          CONTRACT_ADDRESS,
          MintableERC20ABI.abi,
          walletSigner
        )
      } else if (provider) {
        // Use provider for read-only operations
        contractInstance = new ethers.Contract(
          CONTRACT_ADDRESS,
          MintableERC20ABI.abi,
          provider
        )
      } else {
        console.error('No provider or wallet available')
        return
      }

      setContract(contractInstance)
    } catch (error) {
      console.error('Failed to connect contract:', error)
    }
  }

  return {
    contract,
    provider,
    signer,
    connectContract
  }
}

