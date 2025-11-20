import {createPublicClient, defineChain, http} from "viem"
import { privateKeyToAccount } from "viem/accounts"

export const getChain = (url: string) => defineChain({
    id: 31337,
    name: "Testnet",
    network: 'Testnet',
    nativeCurrency:{
        name: 'ETH',
        symbol: 'ETH',
        decimals: 10,
    },
    rpcUrls:{
        default:{
            http: [url],
        }
    }
})

async function main(){
    const url ="http://localhost:8545"
    const publicClient = createPublicClient({ chain: getChain(url), transport: http() })
    const blockNumber = await publicClient.getBlockNumber()
    const privateKey = "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133"
    const wallet = privateKeyToAccount(privateKey)
    const walletAddress = wallet.address
    const balance = await publicClient.getBalance({ address: walletAddress })
    console.log(`blockNumber is ${blockNumber}, result is ${balance}`)
}

main()