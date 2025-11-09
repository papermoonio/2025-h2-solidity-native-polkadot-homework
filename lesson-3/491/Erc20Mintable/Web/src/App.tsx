import { useState, useEffect } from 'react'
import { ContractInfo } from './components/ContractInfo'
import { MintSection } from './components/MintSection'
import { MintHistory } from './components/MintHistory'
import { WalletConnection } from './components/WalletConnection'
import { useContract } from './hooks/useContract'
import './App.css'

function App() {
  const [account, setAccount] = useState<string | null>(null)
  const { contract, provider, signer, connectContract } = useContract()

  useEffect(() => {
    if (account) {
      connectContract(account)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Mintable ERC20 Token</h1>
        <WalletConnection 
          account={account} 
          setAccount={setAccount}
          provider={provider}
        />
      </header>

      <main className="app-main">
        {account ? (
          <>
            <ContractInfo contract={contract} account={account} />
            <MintSection contract={contract} account={account} />
            <MintHistory contract={contract} account={account} />
          </>
        ) : (
          <div className="connect-prompt">
            <p>Please connect your wallet to interact with the contract</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App

