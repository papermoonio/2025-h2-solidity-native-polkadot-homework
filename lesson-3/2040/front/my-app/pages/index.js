import React, { useEffect, useState } from "react";
import { Container, Button, Menu, Icon } from "semantic-ui-react";
import detectEthereumProvider from "@metamask/detect-provider";
import * as ethers from "ethers";
import Head from "next/head";
import DataFeed from "../components/datafeed-page";
import { Link } from "../routes";

const App = () => {
  // Initial State
  const [account, setAccount] = useState();
  const [connected, setConnected] = useState(false);
  const [networkName, setNetworkName] = useState("Not Connected");
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    // Check for changes in Metamask (account and chain)
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
      window.ethereum.on("accountsChanged", () => {
        window.location.reload();
      });
    }
    
    // Check if already connected
    checkMetamask();
  }, []);

  const checkMetamask = async () => {
    const provider = await detectEthereumProvider({ mustBeMetaMask: true });

    if (provider) {
      try {
        // 获取网络信息
        const chainId = await provider.request({
          method: "eth_chainId",
        });

        let networkName;
        // Check for local Hardhat network (chainId 31337) or Polkadot Asset Hub Testnet
        switch (chainId) {
          case "0x7a69":
            networkName = "Local Hardhat Network";
            break;
          case "0x190f1b46":
            networkName = "PAsset Hub";
            break;
          default:
            networkName = `Unknown Network (${chainId})`;
            break;
        }

        setNetworkName(networkName);
        
        // 检查是否连接到本地Hardhat网络
        if (chainId !== "0x7a69") {
          setConnectionError("Please connect to the Local Hardhat Network (localhost:8545)");
          setAccount(null);
          setConnected(false);
          return;
        }

        // Request account access
        const accounts = await ethereum.request({
          method: "eth_requestAccounts",
        });

        console.log("accounts in index.js", accounts);

        setConnectionError(null);

        // Update State
        if (accounts && accounts.length > 0) {
          console.log("accounts if accounts", accounts);
          setAccount(ethers.utils.getAddress(accounts[0]));
          setConnected(true);
        }
      } catch (error) {
        console.error("Failed to connect to MetaMask:", error);
        setConnectionError(`Connection failed: ${error.message}`);
        setNetworkName("Connection Failed");
      }
    } else {
      // MetaMask not detected
      setConnectionError("MetaMask not detected. Please install MetaMask to use this application.");
      setNetworkName("MetaMask not Detected");
    }
  };

  const onConnect = async () => {
    await checkMetamask();
  };

  return (
    <Container>
      <Head>
        <title>Polkadot Hub TestNet ERC20Mint</title>
        <link rel="icon" type="image/png" sizes="32x32" href="./favicon.svg" />
        <link
          rel="stylesheet"
          href="//cdn.jsdelivr.net/npm/semantic-ui@2.4.2/dist/semantic.min.css"
        />
      </Head>
      <Menu style={{ marginTop: "10px" }}>
        <Link route="/">
          <a className="item">Polkadot Hub TestNet ERC20 Faucet</a>
        </Link>
        <Menu.Menu position="right">
          <a className="item"> {account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : 'Not connected'} </a>
          {connected ? (
            <Button floated="right" icon labelPosition="left" color="green">
              <Icon name="check"></Icon>
              {networkName}
            </Button>
          ) : (
            <Button
              floated="right"
              icon
              labelPosition="left"
              onClick={onConnect}
              primary
            >
              <Icon name="plus square"></Icon>
              Connect EVM Wallet
            </Button>
          )}
        </Menu.Menu>
      </Menu>
      <br />
      {connectionError && (
        <div style={{ color: 'red', padding: '10px', marginBottom: '10px', border: '1px solid red', borderRadius: '4px' }}>
          {connectionError}
        </div>
      )}
      <DataFeed account={account} />
      <br />
      <h3>About MintableERC20</h3>
      <p>
        This interface allows you to interact with MintableERC20 contracts deployed on the local Hardhat network.
        Each token contract allows users to mint 100 tokens every hour. The owner of the contract can mint unlimited tokens
        for any address at any time.
      </p>
      <p>
        Contract functions:
        <ul>
          <li><code>mintToken()</code> - Mint 100 tokens (once per hour per address)</li>
          <li><code>canMint(address)</code> - Check if an address can mint tokens</li>
          <li><code>ownerMint(address, amount)</code> - Owner only function to mint any amount to any address</li>
          <li><code>setInterval(seconds)</code> - Owner only function to change the minting interval</li>
        </ul>
      </p>
      <p>
        Don't judge the code :) as it is for demonstration purposes only. You
        can check the source code &nbsp;
        <a href="https://github.com/papermoonio/polkadot-mintableERC20">here</a>
      </p>
      <br />
    </Container>
  );
};

export default App;
