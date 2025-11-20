import { Contract, JsonRpcProvider, Signer } from 'ethers'

export interface ContractData {
  name: string
  symbol: string
  decimals: number
  totalSupply: string
  balance: string
  cooldown: number
}

export interface MintRecord {
  to: string
  amount: string
  timestamp: number
  blockNumber: number
  transactionHash: string
}

export interface UseContractReturn {
  contract: Contract | null
  provider: JsonRpcProvider | null
  signer: Signer | null
  connectContract: (account: string) => Promise<void>
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on?: (event: string, handler: () => void) => void
      removeListener?: (event: string, handler: () => void) => void
    }
  }
}

