import React, { useState, useEffect } from "react";
import { Button, Form, Table, Container } from "semantic-ui-react";
import { tokenNames } from "../ethereum/tokenNames";
import tokenInstance from "../ethereum/feed";

const addresses = require("../ethereum/addresses");

const DataFeed = ({ account }) => {
  // State for token data, keyed by token address for efficient lookup.
  const [tokenData, setTokenData] = useState({});
  // State for loading indicators, keyed by token address.
  const [loadingStates, setLoadingStates] = useState({});
  // State for network errors
  const [networkError, setNetworkError] = useState(null);

  // Fetches balance and minting details for a single token.
  // Now returns the address to be used as a key.
  const getBalance = async (address) => {
    try {
      if (account?.slice(0, 2) !== "0x") {
        return { address, balance: "0.00", mint: false, timeLeft: "0" };
      }
      
      console.log("account", account);
      console.log("address", address);
      const contractInstance = tokenInstance(address);
      
      // Check if contract instance was created successfully
      if (!contractInstance) {
        throw new Error("Failed to create contract instance. Check if MetaMask is connected to the correct network.");
      }
      
      console.log("contractInstance", contractInstance);

      // Try to get basic token info first
      let name, symbol, dec;
      try {
        // 先检查合约是否可访问
        const code = await contractInstance.provider.getCode(address);
        if (code === '0x') {
          throw new Error("No contract found at this address. Make sure the contract is deployed.");
        }
        
        name = await contractInstance.name();
        symbol = await contractInstance.symbol();
        dec = await contractInstance.decimals();
      } catch (error) {
        console.error("Error getting basic token info:", error);
        throw new Error(`Unable to fetch token information. ${error.message}`);
      }

      console.log("Token Info:", { name, symbol, dec: dec.toString() });

      // Then get user-specific info
      let mint, interval, lastMint, balance;
      try {
        [mint, interval, lastMint, balance] = await Promise.all([
          contractInstance.canMint(account),
          contractInstance.interval(),
          contractInstance.lastMintTime(account),
          contractInstance.balanceOf(account),
        ]);
      } catch (error) {
        console.error("Error getting user-specific token info:", error);
        throw new Error(`Unable to fetch user-specific token information. ${error.message}`);
      }

      // Calculate time left until next mint
      const currentTime = Math.floor(Date.now() / 1000);
      const lastMintTime = parseInt(lastMint);
      const intervalTime = parseInt(interval);
      
      let timeLeft = 0;
      if (lastMintTime > 0) {
        const nextMintTime = lastMintTime + intervalTime;
        timeLeft = Math.max(0, nextMintTime - currentTime);
      }

      console.log("timeLeft", timeLeft);

      return {
        address,
        balance: (Number(balance) / 10 ** Number(dec)).toFixed(2),
        mint: mint,
        timeLeft: timeLeft.toString(),
      };
    } catch (error) {
      console.error(`Error fetching data for token ${address}:`, error);
      setNetworkError(`Error fetching data: ${error.message}`);
      return { address, balance: "Error", mint: false, timeLeft: "0" };
    }
  };

  useEffect(() => {
    // Fetches data for all tokens in parallel.
    const updateAllBalances = async () => {
      if (!account) {
        // Reset data when not connected
        setTokenData({});
        setNetworkError(null);
        return;
      }

      setNetworkError(null);
      try {
        // Create an array of promises for all token data fetches
        const promises = tokenNames.map((token) => {
          console.log("token", token.name);
          const address = addresses[token.name.toLowerCase()];
          return getBalance(address);
        });

        // Await all promises to resolve
        const results = await Promise.all(promises);

        // Transform the array of results into an object keyed by address
        const dataByAddress = results.reduce((acc, data) => {
          if (data) {
            acc[data.address] = data;
          }
          return acc;
        }, {});

        setTokenData(dataByAddress);
      } catch (error) {
        console.error("Failed to batch load token data:", error);
        setNetworkError(`Failed to load token data: ${error.message}`);
      }
    };

    updateAllBalances(); // Initial fetch

    const intervalId = setInterval(updateAllBalances, 15000); // Refresh every 15 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [account]);

  // Toggles the loading state for a specific button.
  const setButtonLoading = (address, key, isLoading) => {
    setLoadingStates((prev) => ({
      ...prev,
      [address]: { ...prev[address], [key]: isLoading },
    }));
  };

  // Handles the token minting process for a specific token.
  const onMint = async (tokenAddress) => {
    setButtonLoading(tokenAddress, "mint", true);
    setNetworkError(null);
    try {
      const contractInstance = tokenInstance(tokenAddress);
      
      // Check if contract instance was created successfully
      if (!contractInstance) {
        throw new Error("Failed to create contract instance");
      }
      
      const tx = await contractInstance.mintToken();
      await tx.wait();
      // Refresh data for the minted token for immediate feedback
      const updatedData = await getBalance(tokenAddress);
      setTokenData((prev) => ({ ...prev, [tokenAddress]: updatedData }));
    } catch (err) {
      console.error("Minting failed:", err);
      setNetworkError(`Minting failed: ${err.message}`);
    } finally {
      setButtonLoading(tokenAddress, "mint", false);
    }
  };

  // Handles adding a token to Metamask.
  const addToMetamask = async (address, imageURL) => {
    setButtonLoading(address, "add", true);
    setNetworkError(null);
    try {
      const contractInstance = tokenInstance(address);
      
      // Check if contract instance was created successfully
      if (!contractInstance) {
        throw new Error("Failed to create contract instance");
      }
      
      const [dec, symbol] = await Promise.all([
        contractInstance.decimals(),
        contractInstance.symbol(),
      ]);

      await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: { address, symbol, decimals: Number(dec), image: imageURL },
        },
      });
    } catch (error) {
      console.error("Failed to add token to Metamask:", error);
      setNetworkError(`Failed to add token to wallet: ${error.message}`);
    } finally {
      setButtonLoading(address, "add", false);
    }
  };

  const renderRows = () => {
    const { Row, Cell } = Table;

    return tokenNames.map((token, index) => {
      const tokenNameLower = token.name.toLowerCase();
      const tokenAddress = addresses[tokenNameLower];
      const data = tokenData[tokenAddress];
      const isLoading = loadingStates[tokenAddress] || {};

      const imgName = `/logos/${tokenNameLower}.svg`;
      const imgURL = `https://raw.githubusercontent.com/papermoonio/passetHub-mintableERC20/main/mintableERC20-interface/public${imgName}`;
      const expURL = `https://blockscout-passet-hub.parity-testnet.parity.io/token/${tokenAddress}`;

      const balance = data?.balance || "N/A";
      const mintEnabled = data?.mint || false;
      const remainingTime = data?.timeLeft || 0;

      // Format time for display
      const formatTime = (seconds) => {
        const sec = parseInt(seconds);
        if (sec <= 0) return "0s";
        if (sec < 60) return `${sec}s`;
        const min = Math.floor(sec / 60);
        if (min < 60) return `${min}m`;
        const hours = Math.floor(min / 60);
        return `${hours}h`;
      };

      return (
        <Row key={index}>
          <Cell>
            <img
              src={imgName}
              style={{ width: 32, height: 32 }}
              alt={`${token.name} logo`}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </Cell>
          <Cell>{token.name}</Cell>
          <Cell>{token.symbol}</Cell>
          <Cell>
            <a href={expURL} target="_blank" rel="noopener noreferrer">
              {tokenAddress.substring(0, 6)}...{tokenAddress.substring(tokenAddress.length - 4)}
            </a>
          </Cell>
          <Cell>{balance}</Cell>
          <Cell>
            <Form onSubmit={(e) => {
              e.preventDefault();
              onMint(tokenAddress);
            }}>
              <Button
                type="submit"
                loading={isLoading.mint}
                disabled={isLoading.mint || !mintEnabled}
                color="orange"
                content={mintEnabled ? "Mint 100 Tokens" : `${formatTime(remainingTime)} left`}
              />
            </Form>
          </Cell>
          <Cell>
            <Form onSubmit={(e) => {
              e.preventDefault();
              addToMetamask(tokenAddress, imgURL);
            }}>
              <Button
                type="submit"
                loading={isLoading.add}
                disabled={isLoading.add}
                color="orange"
                content="Add to Wallet"
              />
            </Form>
          </Cell>
        </Row>
      );
    });
  };

  const { Header, Row, HeaderCell, Body } = Table;

  return (
    <div>
      <h3>Token Balance Information</h3>
      {networkError && (
        <div style={{ color: 'red', padding: '10px', marginBottom: '10px', border: '1px solid red', borderRadius: '4px' }}>
          {networkError}
        </div>
      )}
      <p>
        Information displayed in the following table corresponds to your
        on-chain balance of each of the following ERC20 tokens on the local Hardhat network! <br />
        Users can mint 100 tokens every hour in each ERC20 token contract.
      </p>
      <Container>
        <Table textAlign="center">
          <Header>
            <Row>
              <HeaderCell>Logo</HeaderCell>
              <HeaderCell>Token Name</HeaderCell>
              <HeaderCell>Symbol</HeaderCell>
              <HeaderCell>Address</HeaderCell>
              <HeaderCell>Balance</HeaderCell>
              <HeaderCell>Mint</HeaderCell>
              <HeaderCell>Add to Wallet</HeaderCell>
            </Row>
          </Header>
          <Body>{renderRows()}</Body>
        </Table>
      </Container>
    </div>
  );
};

export default DataFeed;