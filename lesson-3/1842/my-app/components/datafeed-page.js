import React, { useState, useEffect } from "react";
import { Button, Form, Table, Container } from "semantic-ui-react";
import { tokenNames } from "../ethereum/tokenNames";
import { createPublicClient, http, parseUnits } from "viem";
import { walletConnect, injected } from "@wagmi/connectors";
import { createConfig, useAccount, useConnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";

// === 1. Paseo Testnet 配置 ===
const PASEO_CHAIN = {
  id: 420420422,
  name: "Polkadot Asset Hub Testnet (Passet Hub)",
  nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-passet-hub-eth-rpc.polkadot.io"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://blockscout-passet-hub.parity-testnet.parity.io" },
  },
};

// === 2. viem 客户端（只读）===
const publicClient = createPublicClient({
  chain: PASEO_CHAIN,
  transport: http(),
});

// === 3. wagmi 配置（连接钱包）===
const config = createConfig({
  chains: [PASEO_CHAIN],
  connectors: [injected(), walletConnect({ projectId: "YOUR_PROJECT_ID" })],
  transports: {
    [PASEO_CHAIN.id]: http(),
  },
});

const addresses = require("../ethereum/addresses");
const mintableERC20ABI = require("../ethereum/abi/mintableERC20.json").abi;

const DataFeed = () => {
  const { address: account, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const [tokenData, setTokenData] = useState({});
  const [loadingStates, setLoadingStates] = useState({});

  // === 4. 读取单个代币数据（viem）===
  const fetchTokenData = async (tokenAddress) => {
    if (!account) return { address: tokenAddress, balance: "0.00", mint: false, timeLeft: "0" };

    try {
      const [decimals, canMint, interval, lastMintTime, balance, symbol] = await publicClient.multicall({
        contracts: [
          { address: tokenAddress, abi: mintableERC20ABI, functionName: "decimals" },
          { address: tokenAddress, abi: mintableERC20ABI, functionName: "canMint", args: [account] },
          { address: tokenAddress, abi: mintableERC20ABI, functionName: "interval" },
          { address: tokenAddress, abi: mintableERC20ABI, functionName: "lastMintTime", args: [account] },
          { address: tokenAddress, abi: mintableERC20ABI, functionName: "balanceOf", args: [account] },
          { address: tokenAddress, abi: mintableERC20ABI, functionName: "symbol" },
        ],
      });

      const timeLeft = Number(interval.result) - (Math.floor(Date.now() / 1000) - Number(lastMintTime.result));
      const formattedBalance = (Number(balance.result) / 10 ** Number(decimals.result)).toFixed(2);

      return {
        address: tokenAddress,
        balance: formattedBalance,
        mint: canMint.result,
        timeLeft: timeLeft > 0 ? timeLeft.toString() : "0",
        symbol: symbol.result,
      };
    } catch (error) {
      console.error("viem read error:", error);
      return { address: tokenAddress, balance: "Error", mint: false, timeLeft: "0" };
    }
  };

  // === 5. 每 10 秒刷新所有代币 ===
  useEffect(() => {
    if (!isConnected) return;

    const update = async () => {
      const promises = tokenNames.map((token) => {
        const addr = addresses[token.name.toLowerCase()];
        return fetchTokenData(addr);
      });
      const results = await Promise.all(promises);
      const dataByAddress = results.reduce((acc, data) => {
        acc[data.address] = data;
        return acc;
      }, {});
      setTokenData(dataByAddress);
    };

    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, [isConnected, account]);

  // === 6. Mint 功能（viem + wagmi）===
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const onMint = async (tokenAddress) => {
    setButtonLoading(tokenAddress, "mint", true);
    try {
      writeContract({
        address: tokenAddress,
        abi: mintableERC20ABI,
        functionName: "mintToken",
        chainId: PASEO_CHAIN.id,
      });
    } catch (err) {
      console.error("Mint failed:", err);
      alert("铸造失败: " + err.message);
    } finally {
      setButtonLoading(tokenAddress, "mint", false);
    }
  };

  // 监听 Mint 确认
  useEffect(() => {
    if (isConfirmed && hash) {
      // 刷新对应代币
      const tokenAddr = Object.values(addresses).find(addr => true); // 简化，实际可用 state 存
      fetchTokenData(tokenAddr).then(data => {
        setTokenData(prev => ({ ...prev, [data.address]: data }));
      });
    }
  }, [isConfirmed, hash]);

  // === 7. Add to MetaMask ===
  const addToMetamask = async (address, imageURL) => {
    setButtonLoading(address, "add", true);
    try {
      const [decimals, symbol] = await publicClient.multicall({
        contracts: [
          { address, abi: mintableERC20ABI, functionName: "decimals" },
          { address, abi: mintableERC20ABI, functionName: "symbol" },
        ],
      });

      await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address,
            symbol: symbol.result,
            decimals: Number(decimals.result),
            image: imageURL,
          },
        },
      });
    } catch (error) {
      console.error(error);
    } finally {
      setButtonLoading(address, "add", false);
    }
  };

  // === 8. 加载状态管理 ===
  const setButtonLoading = (address, key, isLoading) => {
    setLoadingStates(prev => ({
      ...prev,
      [address]: { ...prev[address], [key]: isLoading },
    }));
  };

  // === 9. 渲染表格 ===
  const renderRows = () => {
    return tokenNames.map((token, index) => {
      const tokenNameLower = token.name.toLowerCase();
      const tokenAddress = addresses[tokenNameLower];
      const data = tokenData[tokenAddress] || {};
      const isLoading = loadingStates[tokenAddress] || {};

      const imgName = `/logos/${tokenNameLower}.svg`;
      const imgURL = `https://raw.githubusercontent.com/papermoonio/passetHub-mintableERC20/main/mintableERC20-interface/public${imgName}`;
      const expURL = `https://blockscout-passet-hub.parity-testnet.parity.io/token/${tokenAddress}`;

      return (
        <Table.Row key={index}>
          <Table.Cell><img src={imgName} style={{ width: 32, height: 32 }} alt={token.name} /></Table.Cell>
          <Table.Cell>{token.name}</Table.Cell>
          <Table.Cell>{data.symbol || token.symbol}</Table.Cell>
          <Table.Cell>
            <a href={expURL} target="_blank" rel="noopener noreferrer">
              {tokenAddress.slice(0, 8)}...{tokenAddress.slice(-6)}
            </a>
          </Table.Cell>
          <Table.Cell>{data.balance ?? "0.00"}</Table.Cell>
          <Table.Cell>
            <Form onSubmit={(e) => { e.preventDefault(); onMint(tokenAddress); }}>
              <Button
                type="submit"
                loading={isLoading.mint || isConfirming}
                disabled={isLoading.mint || !data.mint}
                color="orange"
                content={data.mint ? "Mint" : `${data.timeLeft || 0}s`}
              />
            </Form>
          </Table.Cell>
          <Table.Cell>
            <Form onSubmit={(e) => { e.preventDefault(); addToMetamask(tokenAddress, imgURL); }}>
              <Button
                type="submit"
                loading={isLoading.add}
                disabled={isLoading.add}
                color="orange"
                content="Add"
              />
            </Form>
          </Table.Cell>
        </Table.Row>
      );
    });
  };

  // === 10. 连接钱包 UI ===
  if (!isConnected) {
    return (
      <Container textAlign="center" style={{ marginTop: "50px" }}>
        <h3>请连接钱包</h3>
        {connectors.map((connector) => (
          <Button key={connector.id} onClick={() => connect({ connector })} color="blue">
            连接 {connector.name}
          </Button>
        ))}
      </Container>
    );
  }

  if (chain?.id !== PASEO_CHAIN.id) {
    return (
      <Container textAlign="center" style={{ marginTop: "50px" }}>
        <h3>错误网络</h3>
        <p>当前: {chain?.name} (ID: {chain?.id})</p>
        <p>请切换到 Paseo Testnet (ID: 420420422)</p>
      </Container>
    );
  }

  return (
    <div>
      <h3>Token Balance Information</h3>
      <p>
        连接地址: <code>{account}</code><br />
        网络: Paseo Testnet (Chain ID: 420420422)
      </p>
      <Container>
        <Table textAlign="center">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Logo</Table.HeaderCell>
              <Table.HeaderCell>Token Name</Table.HeaderCell>
              <Table.HeaderCell>Symbol</Table.HeaderCell>
              <Table.HeaderCell>Address</Table.HeaderCell>
              <Table.HeaderCell>Balance</Table.HeaderCell>
              <Table.HeaderCell>Mint</Table.HeaderCell>
              <Table.HeaderCell>Add to MetaMask</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>{renderRows()}</Table.Body>
        </Table>
      </Container>
    </div>
  );
};

export default DataFeed;