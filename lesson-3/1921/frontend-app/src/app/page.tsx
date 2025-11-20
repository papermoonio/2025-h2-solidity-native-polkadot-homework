'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, SEPOLIA_NETWORK_CONFIG } from '../lib/contract';
import { getMetaMaskProvider, resetMetaMaskProvider, forceMetaMaskRequest } from '../lib/metamask';

interface WalletState {
  isConnected: boolean;
  account: string | null;
  balance: string;
  tokenBalance: string;
  canMint: boolean;
  remainingTime: number;
  mintInterval: number;
}

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    account: null,
    balance: '0',
    tokenBalance: '0',
    canMint: false,
    remainingTime: 0,
    mintInterval: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string>('');
  const [localRemainingTime, setLocalRemainingTime] = useState(0);

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  // 简单直接的MetaMask连接
  const connectWallet = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setMessage('🦊 连接MetaMask中...');
    
    try {
      // 直接使用window.ethereum
      if (!window.ethereum) {
        throw new Error('请安装MetaMask扩展');
      }

      // 请求账户访问
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('未找到账户');
      }

      const account = accounts[0];
      console.log('✅ 连接成功:', account);
      
      // 更新钱包状态
      setWallet(prev => ({ 
        ...prev, 
        isConnected: true, 
        account 
      }));
      
      setMessage('✅ 连接成功！加载数据中...');
      
      // 加载数据
      await loadAccountData(account);
      setMessage('🎉 DApp已就绪！');
      
    } catch (error: any) {
      console.error('连接失败:', error);
      
      if (error.code === 4001) {
        setMessage('❌ 用户取消了连接');
      } else if (error.code === -32002) {
        setMessage('❌ MetaMask忙碌中，请稍后重试');
      } else {
        setMessage(`❌ 连接失败: ${error.message || '未知错误'}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // 切换到Sepolia网络
  const switchToSepolia = async () => {
    try {
      await forceMetaMaskRequest('wallet_switchEthereumChain', [
        { chainId: '0x' + SEPOLIA_NETWORK_CONFIG.chainId.toString(16) }
      ]);
    } catch (error: any) {
      if (error.code === 4902) {
        // 网络不存在，添加网络
        await forceMetaMaskRequest('wallet_addEthereumChain', [SEPOLIA_NETWORK_CONFIG]);
      }
    }
  };

  // 加载账户数据
  const loadAccountData = async (account: string) => {
    try {
      // 直接使用window.ethereum
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, ethersProvider);

      // 加载基本数据
      const ethBalance = await ethersProvider.getBalance(account);
      const tokenBalance = await contract.balanceOf(account);
      const canMint = await contract.canMint(account);
      const remainingTime = await contract.getRemainingTime(account);
      const mintInterval = await contract.interval();

      setWallet(prev => ({
        ...prev,
        balance: ethers.formatEther(ethBalance),
        tokenBalance: ethers.formatUnits(tokenBalance, 18),
        canMint,
        remainingTime: Number(remainingTime),
        mintInterval: Number(mintInterval)
      }));

      // 初始化本地倒计时
      setLocalRemainingTime(Number(remainingTime));

    } catch (error: any) {
      console.error('加载数据失败:', error);
      throw error;
    }
  };

  // 铸造代币
  const mintToken = async () => {
    if (!wallet.isConnected || !wallet.canMint || isLoading) return;

    try {
      setIsLoading(true);
      setMessage('🦊 准备交易...');

      // 直接使用window.ethereum
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await ethersProvider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      setMessage('🦊 请在MetaMask中签名...');
      
      const tx = await contract.mintToken();
      console.log('✅ 交易发送:', tx.hash);
      
      setMessage(`⏳ 等待确认... (${tx.hash.slice(0,10)}...)`);
      setLastTxHash(tx.hash);
      
      await tx.wait();
      
      setMessage('🎉 铸造成功！');
      
      // 重置倒计时
      setLocalRemainingTime(wallet.mintInterval);
      
      // 刷新数据
      await loadAccountData(wallet.account!);
      
    } catch (error: any) {
      console.error('铸造失败:', error);
      
      if (error.code === 4001) {
        setMessage('❌ 用户取消了交易');
      } else {
        setMessage(`❌ 铸造失败: ${error.reason || error.message || '未知错误'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 添加代币到MetaMask
  const addTokenToWallet = async () => {
    try {
      setMessage('🦊 添加代币到MetaMask...');

      // 直接调用MetaMask API
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: CONTRACT_ADDRESS,
            symbol: 'S1921',
            decimals: 18,
          },
        },
      });
      
      setMessage('✅ S1921代币已添加到MetaMask！');
    } catch (error: any) {
      console.error('添加代币失败:', error);
      if (error.code === 4001) {
        setMessage('❌ 用户取消了添加');
      } else {
        setMessage(`❌ 添加失败: ${error.message}`);
      }
    }
  };

  // 断开连接
  const disconnectWallet = () => {
    setWallet({
      isConnected: false,
      account: null,
      balance: '0',
      tokenBalance: '0',
      canMint: false,
      remainingTime: 0,
      mintInterval: 0
    });
    setMessage('');
    resetMetaMaskProvider();
  };

  // 定期刷新数据
  useEffect(() => {
    if (wallet.isConnected && wallet.account) {
      const interval = setInterval(() => {
        loadAccountData(wallet.account!);
      }, 15000); // 每15秒刷新一次

      return () => clearInterval(interval);
    }
  }, [wallet.isConnected, wallet.account]);

  // 监听账户变化
  useEffect(() => {
    const provider = getMetaMaskProvider();
    if (provider) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== wallet.account) {
          setWallet(prev => ({ ...prev, account: accounts[0] }));
          loadAccountData(accounts[0]);
        }
      };

      provider.on('accountsChanged', handleAccountsChanged);
      return () => {
        provider.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [wallet.account]);

  // 实时倒计时更新
  useEffect(() => {
    if (localRemainingTime > 0) {
      const countdown = setInterval(() => {
        setLocalRemainingTime(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            // 倒计时结束，刷新数据检查是否可以mint
            if (wallet.account) {
              loadAccountData(wallet.account);
            }
            return 0;
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(countdown);
    }
  }, [localRemainingTime, wallet.account]);

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* 背景装饰 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="max-w-lg mx-auto">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 glow">
            <span className="text-3xl">🪙</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            MintableERC20 DApp
          </h1>
          <p className="text-gray-600 flex items-center justify-center gap-2">
            <span className="text-2xl">🦊</span>
            专业级 MetaMask 钱包集成
          </p>
        </div>

        {!wallet.isConnected ? (
          <div className="space-y-6">
            {/* 警告卡片 */}
            <div className="card bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-400">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🚨</span>
                </div>
                <div>
                  <h3 className="font-semibold text-red-800 mb-2">多钱包环境检测</h3>
                  <div className="text-red-700 text-sm space-y-1">
                    <p>• 本DApp专为MetaMask优化</p>
                    <p>• 请确保MetaMask已安装并启用</p>
                    <p>• 如有其他钱包，请选择MetaMask</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 连接按钮 */}
            <div className="card text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-400 to-red-500 rounded-2xl mb-4">
                  <span className="text-2xl">🦊</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">连接MetaMask钱包</h3>
                <p className="text-gray-600 text-sm">安全连接到去中心化应用</p>
              </div>
              
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className={`w-full py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-300 transform ${
                  isConnecting 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'btn-warning hover:scale-105'
                }`}
              >
                {isConnecting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>连接中...请在MetaMask中确认</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>🦊</span>
                    <span>连接 MetaMask</span>
                  </div>
                )}
              </button>

              <p className="mt-4 text-xs text-gray-500">
                首次连接需要在MetaMask中确认授权
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 连接状态 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex justify-between items-center">
              <p className="text-green-700 text-sm">
                ✅ 已连接到 MetaMask 🦊
              </p>
              <button
                onClick={disconnectWallet}
                className="text-xs text-red-600 hover:underline"
              >
                断开
              </button>
            </div>

            {/* 账户信息 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-2">账户信息</h3>
              <p className="text-sm text-gray-600">
                地址: {wallet.account?.slice(0, 6)}...{wallet.account?.slice(-4)}
              </p>
              <p className="text-sm text-gray-600">
                ETH: {parseFloat(wallet.balance).toFixed(4)}
              </p>
              <p className="text-sm text-gray-600">
                S1921: {parseFloat(wallet.tokenBalance).toFixed(2)}
              </p>
            </div>

            {/* Mint设置 */}
            {wallet.mintInterval > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-2">Mint设置</h3>
                <p className="text-sm text-gray-600">
                  冷却间隔: {formatTime(wallet.mintInterval)}
                </p>
                <p className="text-sm text-gray-600">
                  每次铸造: 1 S1921 代币
                </p>
              </div>
            )}

            {/* 铸造功能 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-4">🦊 MetaMask铸造</h3>
              
              {(wallet.canMint && localRemainingTime <= 0) ? (
                <button
                  onClick={mintToken}
                  disabled={isLoading}
                  className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors ${
                    isLoading 
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {isLoading ? '🦊 MetaMask铸造中...' : '🦊 使用MetaMask铸造 1 S1921'}
                </button>
              ) : (
                <div>
                  <p className="text-red-600 text-sm mb-2">
                    冷却中，剩余: {formatTime(localRemainingTime)}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-red-400 h-2 rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.max(0, 100 - (localRemainingTime / wallet.mintInterval * 100))}%`
                      }}
                    />
                  </div>
                  <button
                    disabled
                    className="w-full bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg cursor-not-allowed"
                  >
                    {localRemainingTime <= 0 ? '🔄 准备中...' : '⏳ 等待冷却时间'}
                  </button>
                </div>
              )}
            </div>

            {/* 添加代币按钮 */}
            <button
              onClick={addTokenToWallet}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              🦊 添加 S1921 到 MetaMask
            </button>

            {/* 最后交易信息 */}
            {lastTxHash && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h3 className="font-semibold text-gray-700 mb-2">🎉 最近交易</h3>
                <p className="text-sm text-gray-600 mb-2">
                  交易哈希: {lastTxHash.slice(0, 10)}...{lastTxHash.slice(-8)}
                </p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${lastTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline text-sm"
                >
                  🔗 在区块浏览器查看交易详情
                </a>
              </div>
            )}
          </div>
        )}

        {/* 状态消息 */}
        {message && (
          <div className={`mt-6 p-3 rounded-lg border ${
            message.includes('SUCCESS') || message.includes('✅') || message.includes('🎉')
              ? 'bg-green-50 border-green-200 text-green-700'
              : message.includes('ERROR') || message.includes('❌')
              ? 'bg-red-50 border-red-200 text-red-700'  
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <p className="text-sm text-center">{message}</p>
          </div>
        )}

        {/* 项目信息 */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>👨‍🎓 学号: 1921 | 🌐 Sepolia测试网</p>
          <p>📝 合约: {CONTRACT_ADDRESS.slice(0, 10)}...</p>
          <p>
            🔗 <a 
              href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              在区块浏览器查看合约
            </a>
          </p>
          {wallet.isConnected && wallet.account && (
            <p>
              👤 <a 
                href={`https://sepolia.etherscan.io/address/${wallet.account}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                查看我的交易记录
              </a>
            </p>
          )}
          <div className="mt-2 text-orange-600">
            <strong>🦊 本DApp强制使用MetaMask钱包</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
