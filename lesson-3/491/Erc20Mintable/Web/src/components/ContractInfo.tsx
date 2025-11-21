import { useState, useEffect } from 'react'
import { Contract, ethers } from 'ethers'
import type { ContractData } from '../types'
import './ContractInfo.css'

interface ContractInfoProps {
  contract: Contract | null
  account: string | null
}

export function ContractInfo({ contract, account }: ContractInfoProps) {
  const [contractData, setContractData] = useState<ContractData>({
    name: '',
    symbol: '',
    decimals: 0,
    totalSupply: '0',
    balance: '0',
    cooldown: 0
  })
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (contract) {
      loadContractInfo()
    }
  }, [contract, account])

  const loadContractInfo = async (): Promise<void> => {
    if (!contract) return

    setLoading(true)
    try {
      const [name, symbol, decimals, totalSupply, balance, interval] = await Promise.all([
        contract.name() as Promise<string>,
        contract.symbol() as Promise<string>,
        contract.decimals() as Promise<bigint>,
        contract.totalSupply() as Promise<bigint>,
        account ? contract.balanceOf(account) as Promise<bigint> : Promise.resolve(0n),
        contract.interval() as Promise<bigint>
      ])

      setContractData({
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: ethers.formatEther(totalSupply),
        balance: account ? ethers.formatEther(balance) : '0',
        cooldown: Number(interval)
      })
    } catch (error) {
      console.error('Error loading contract info:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="contract-info card">
        <h2>Contract Information</h2>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="contract-info card">
      <h2>Contract Information</h2>
      <div className="info-grid">
        <div className="info-item">
          <span className="info-label">Name:</span>
          <span className="info-value">{contractData.name}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Symbol:</span>
          <span className="info-value">{contractData.symbol}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Decimals:</span>
          <span className="info-value">{contractData.decimals}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Total Supply:</span>
          <span className="info-value">{parseFloat(contractData.totalSupply).toFixed(4)}</span>
        </div>
        {account && (
          <div className="info-item">
            <span className="info-label">Your Balance:</span>
            <span className="info-value">{parseFloat(contractData.balance).toFixed(4)}</span>
          </div>
        )}
        <div className="info-item">
          <span className="info-label">Mint Interval:</span>
          <span className="info-value">{contractData.cooldown / 3600} hours ({contractData.cooldown} seconds)</span>
        </div>
      </div>
    </div>
  )
}

