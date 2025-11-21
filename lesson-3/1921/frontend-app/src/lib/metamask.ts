// MetaMask专用Provider管理器，解决多钱包环境冲突

declare global {
  interface Window {
    ethereum?: any;
  }
}

let cachedProvider: any = null;
let isInitialized = false;

/**
 * 获取MetaMask专用provider
 */
export function getMetaMaskProvider() {
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  if (!window.ethereum) {
    throw new Error('请安装MetaMask浏览器扩展');
  }

  // 直接使用window.ethereum
  cachedProvider = window.ethereum;
  isInitialized = true;
  return window.ethereum;
}

/**
 * 重置provider缓存
 */
export function resetMetaMaskProvider() {
  cachedProvider = null;
  isInitialized = false;
}

/**
 * 强制使用MetaMask发送请求
 */
export async function forceMetaMaskRequest(method: string, params?: any[] | any) {
  const provider = getMetaMaskProvider();
  
  // 处理不同的参数格式
  if (method === 'wallet_watchAsset') {
    // wallet_watchAsset需要对象参数，不是数组
    return await provider.request({ method, params });
  } else {
    // 其他方法通常需要数组参数
    const requestParams = Array.isArray(params) ? params : (params ? [params] : undefined);
    return await provider.request({ method, params: requestParams });
  }
}
