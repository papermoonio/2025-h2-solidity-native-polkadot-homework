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
  chainId: number | null;
}

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    account: null,
    balance: '0',
    tokenBalance: '0',
    canMint: false,
    remainingTime: 0,
    mintInterval: 0,
    chainId: null
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

  // 检查当前网络
  const checkNetwork = async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not available');
      }
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainId, 16);
      
      if (currentChainId !== SEPOLIA_NETWORK_CONFIG.chainId) {
        setMessage('⚠️ 请切换到Sepolia测试网...');
        await switchToSepolia();
        return true;
      }
      return true;
    } catch (error) {
      console.error('网络检查失败:', error);
      return false;
    }
  };

  // 简单直接的MetaMask连接
  const connectWallet = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setMessage('🔗 连接钱包中...');
    
    try {
      console.log('1. 开始连接钱包...');
      
      // 确保在浏览器环境
      if (typeof window === 'undefined') {
        throw new Error('请在浏览器中打开');
      }
      
      // 等待钱包注入完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('2. 检查 window.ethereum:', !!window.ethereum);
      console.log('2.1 钱包信息:', {
        isMetaMask: window.ethereum?.isMetaMask,
        isRabby: window.ethereum?.isRabby,
        isCoinbaseWallet: window.ethereum?.isCoinbaseWallet
      });
      
      // 检查钱包
      if (!window.ethereum) {
        throw new Error('请安装 MetaMask 或其他 Web3 钱包');
      }

      console.log('3. 请求账户授权...');
      
      // 请求账户访问
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('未找到账户');
      }

      const account = accounts[0];
      console.log('✅ 连接成功:', account);
      
      // 检查网络
      setMessage('🔍 检查网络...');
      const networkOk = await checkNetwork();
      if (!networkOk) {
        throw new Error('网络切换失败，请手动切换到Sepolia测试网');
      }
      
      // 获取当前网络ID
      if (!window.ethereum) {
        throw new Error('MetaMask not available');
      }
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainId, 16);
      
      // 更新钱包状态
      setWallet(prev => ({ 
        ...prev, 
        isConnected: true, 
        account,
        chainId: currentChainId
      }));
      
      setMessage('✅ 连接成功！加载数据中...');
      
      // 加载数据
      await loadAccountData(account);
      setMessage('🎉 DApp已就绪！');
      
    } catch (error: any) {
      console.error('连接失败:', error);
      console.error('错误详情:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
      
      if (error.code === 4001) {
        setMessage('❌ 用户取消了连接');
      } else if (error.code === -32002) {
        setMessage('❌ 钱包忙碌中，请稍后重试');
      } else if (error.message?.includes('安装')) {
        setMessage('❌ 请安装 MetaMask 或 Rabby 钱包');
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
      // 再次确认网络
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not available');
      }
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainId, 16);
      
      if (currentChainId !== SEPOLIA_NETWORK_CONFIG.chainId) {
        throw new Error(`请切换到Sepolia测试网 (当前网络: ${currentChainId})`);
      }

      // 直接使用window.ethereum
      if (!window.ethereum) {
        throw new Error('MetaMask not available');
      }
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      
      // 验证合约代码是否存在
      const code = await ethersProvider.getCode(CONTRACT_ADDRESS);
      if (code === '0x') {
        throw new Error('合约在当前网络上不存在，请确保已连接到Sepolia测试网');
      }
      
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
        mintInterval: Number(mintInterval),
        chainId: currentChainId
      }));

      // 初始化本地倒计时
      setLocalRemainingTime(Number(remainingTime));

    } catch (error: any) {
      console.error('加载数据失败:', error);
      
      // 识别 RPC 限流错误
      const errorMsg = error.message || error.reason || '未知错误';
      if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
        throw new Error('RPC 请求频率过高，请稍后再试');
      }
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
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not available');
      }
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
      // 用户取消交易，不显示错误
      if (error.code === 4001) {
        setMessage('');
      } else {
        console.error('铸造失败:', error);
        
        // 识别 RPC 限流错误
        const errorMsg = error.message || error.reason || '未知错误';
        if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
          setMessage('⚠️ RPC 请求频率过高，请稍后再试（建议等待 1-2 分钟）');
        } else {
          setMessage(`❌ 铸造失败: ${errorMsg}`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 添加代币到钱包
  const addTokenToWallet = async () => {
    try {
      setMessage('🔄 正在添加代币...');

      // 直接调用钱包 API
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('请安装 Web3 钱包');
      }
      
      const result = await window.ethereum.request({
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
      
      if (result) {
        setMessage('✅ S1921 代币已添加到钱包！');
      } else {
        setMessage('');
      }
    } catch (error: any) {
      // 用户取消操作，不显示错误
      if (error.code === 4001) {
        setMessage('');
        return;
      }
      
      // 其他错误才显示
      console.error('添加代币失败:', error);
      setMessage(`❌ 添加失败: ${error.message || '未知错误'}`);
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
      mintInterval: 0,
      chainId: null
    });
    setMessage('👋 已断开连接。如需更换钱包，请在 MetaMask 中切换账户或点击“切换账户”按钮');
    resetMetaMaskProvider();
  };

  // 切换账户
  const switchAccount = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setMessage('🔄 打开 MetaMask 选择账户...');
    
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not available');
      }

      // 使用 wallet_requestPermissions 强制弹出账户选择
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });
      
      // 获取新选择的账户
      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('未选择账户');
      }

      const newAccount = accounts[0];
      console.log('🔄 切换到账户:', newAccount);
      
      // 检查网络
      const networkOk = await checkNetwork();
      if (!networkOk) {
        throw new Error('网络切换失败');
      }
      
      // 更新账户
      setWallet(prev => ({ ...prev, account: newAccount }));
      
      // 加载新账户数据
      setMessage('🔍 加载账户数据...');
      await loadAccountData(newAccount);
      
      setMessage(`✅ 已切换到: ${newAccount.slice(0, 6)}...${newAccount.slice(-4)}`);
    } catch (error: any) {
      console.error('连接失败:', error);
      console.error('错误详情:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      if (error.code === 4001) {
        setMessage('❌ 用户拒绝了连接请求');
      } else if (error.message?.includes('安装')) {
        setMessage('❌ 请安装 MetaMask 或 Rabby 钱包');
      } else {
        setMessage(`❌ 连接失败: ${error.message || '未知错误'}`);
      }
    } finally {
      setIsConnecting(false);
    }
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

  // 监听账户和网络变化
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== wallet.account) {
        setWallet(prev => ({ ...prev, account: accounts[0] }));
        loadAccountData(accounts[0]).catch(err => {
          setMessage(`❌ 加载数据失败: ${err.message}`);
        });
      }
    };

    const handleChainChanged = (chainId: string) => {
      console.log('网络切换到:', chainId);
      const newChainId = parseInt(chainId, 16);
      
      if (newChainId !== SEPOLIA_NETWORK_CONFIG.chainId) {
        setMessage('⚠️ 请切换回Sepolia测试网');
        setWallet(prev => ({
          ...prev,
          balance: '0',
          tokenBalance: '0',
          canMint: false,
          remainingTime: 0
        }));
      } else if (wallet.account) {
        setMessage('✅ 已切换到Sepolia，重新加载数据...');
        loadAccountData(wallet.account).catch(err => {
          setMessage(`❌ 加载数据失败: ${err.message}`);
        });
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
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
    <div className="min-h-screen">
      {/* 背景装饰 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* 顶部导航栏 */}
      <nav className="backdrop-blur-md bg-white/80 border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🪙</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  S1921 Token
                </h1>
                <p className="text-xs text-gray-500">Mintable ERC20</p>
              </div>
            </div>
            
            {wallet.isConnected ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">
                    {wallet.account?.slice(0, 6)}...{wallet.account?.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={switchAccount}
                  disabled={isConnecting}
                  className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  切换
                </button>
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  断开
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isConnecting ? '连接中...' : '连接钱包'}
              </button>
            )}
          </div>
        </div>
      </nav>
      
      <div className="max-w-2xl mx-auto px-4 py-8">

        {!wallet.isConnected ? (
          <div className="space-y-6">
            {/* 欢迎卡片 */}
            <div className="card text-center py-12">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl mb-6 glow">
                  <span className="text-4xl">👋</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">欢迎来到 S1921 Token</h2>
                <p className="text-gray-600 text-lg mb-8">连接你的 Web3 钱包开始使用</p>
              </div>
              
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className={`inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all transform ${
                  isConnecting 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl hover:scale-105'
                }`}
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>连接中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 18v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1m18-4l-4-4m0 0l-4 4m4-4v10"/>
                    </svg>
                    <span>连接钱包</span>
                  </>
                )}
              </button>

              <div className="mt-8 pt-8 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-4">支持的钱包</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                    <span className="text-2xl">🦊</span>
                    <span className="text-sm font-medium text-gray-700">MetaMask</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                    <span className="text-2xl">🐰</span>
                    <span className="text-sm font-medium text-gray-700">Rabby</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                    <span className="text-2xl">🔗</span>
                    <span className="text-sm font-medium text-gray-700">其他</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 功能介绍 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🪙</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">免费铸造</h3>
                <p className="text-sm text-gray-600">每分钟免费铸造 1 个代币</p>
              </div>
              <div className="card text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">即时到账</h3>
                <p className="text-sm text-gray-600">交易确认后立即到账</p>
              </div>
              <div className="card text-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">安全可靠</h3>
                <p className="text-sm text-gray-600">智能合约保障安全</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 网络状态提示 */}
            {wallet.chainId !== SEPOLIA_NETWORK_CONFIG.chainId && (
              <div className="card bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="font-semibold text-red-800">错误的网络</p>
                      <p className="text-sm text-red-600">请切换到 Sepolia 测试网</p>
                    </div>
                  </div>
                  <button
                    onClick={switchToSepolia}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    切换网络
                  </button>
                </div>
              </div>
            )}

            {/* 主要内容区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧：余额卡片 */}
              <div className="lg:col-span-1 space-y-4">
                {/* ETH 余额 */}
                <div className="card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">以太币</span>
                    <span className="text-xs text-gray-400">ETH</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{parseFloat(wallet.balance).toFixed(4)}</p>
                </div>
                
                {/* S1921 余额 */}
                <div className="card bg-gradient-to-br from-blue-50 to-purple-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">S1921 代币</span>
                    <button
                      onClick={addTokenToWallet}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + 添加
                    </button>
                  </div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {parseFloat(wallet.tokenBalance).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* 右侧：铸造区域 */}
              <div className="lg:col-span-2">
                <div className="card">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">铸造 S1921</h2>
                    <p className="text-gray-600">每 {formatTime(wallet.mintInterval)} 免费铸造 1 个代币</p>
                  </div>

                  {/* 铸造按钮区域 */}
                  {(wallet.canMint && localRemainingTime <= 0) ? (
                    <button
                      onClick={mintToken}
                      disabled={isLoading}
                      className={`w-full font-bold py-6 px-8 rounded-2xl text-lg transition-all transform ${
                        isLoading 
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl hover:scale-105'
                      }`}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          <span>铸造中...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <span>�</span>
                          <span>立即铸造 1 S1921</span>
                        </div>
                      )}
                    </button>
                  ) : (
                    <div>
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 mb-4">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm font-semibold text-gray-700">冷却中</span>
                          <span className="text-lg font-bold text-blue-600">{formatTime(localRemainingTime)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-4 rounded-full transition-all duration-1000"
                            style={{
                              width: `${Math.max(0, 100 - (localRemainingTime / wallet.mintInterval * 100))}%`
                            }}
                          />
                        </div>
                      </div>
                      <button
                        disabled
                        className="w-full bg-gray-200 text-gray-500 font-semibold py-6 px-8 rounded-2xl cursor-not-allowed text-lg"
                      >
                        ⏳ 等待冷却时间
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 最后交易信息 */}
            {lastTxHash && (
              <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">✅</span>
                    <div>
                      <p className="font-bold text-gray-900">交易成功</p>
                      <p className="text-sm text-gray-600 font-mono">
                        {lastTxHash.slice(0, 10)}...{lastTxHash.slice(-8)}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${lastTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-sm"
                  >
                    查看
                  </a>
                </div>
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
        <div className="mt-8 card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900">项目信息</h3>
              <p className="text-sm text-gray-600">学号 1921 | Sepolia 测试网</p>
            </div>
            <div className="flex gap-2">
              <a 
                href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm"
              >
                合约
              </a>
              {wallet.isConnected && wallet.account && (
                <a 
                  href={`https://sepolia.etherscan.io/address/${wallet.account}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm"
                >
                  交易
                </a>
              )}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">合约地址</p>
            <p className="font-mono text-xs text-gray-700 break-all">
              {CONTRACT_ADDRESS}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
