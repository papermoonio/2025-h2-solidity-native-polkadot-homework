"use client";
import { useEffect, useState } from "react";
import * as ethers from "ethers";
import axios from "axios";
import bgImg from "../app/background.png";
import { ABI, CONTRACT_ADDRESS } from "../types/wallet";

// Polkadot 测试网络。按需替换为你的目标网络参数
const NETWORK_PARAMS = {
    chainId: "0x190f1b46", // 420420422
    chainName: "Polkadot Hub TestNet",
    nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
    rpcUrls: ["https://testnet-passet-hub-eth-rpc.polkadot.io"],
    blockExplorerUrls: ["https://blockscout-passet-hub.parity-testnet.parity.io/"],
} as const;

const TOKEN_PARAMS = {
    type: 'ERC20',
    options: {
        address: '0x944234674141326c38662F5C86465C85c8D10B82', // 替换为你的代币合约地址
        symbol: 'LKZ', // 代币符号
        decimals: 18, // 代币小数位
    },
} as const;

export default function Wallet() {
    const [account, setAccount] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);
    const [network, setNetwork] = useState<string | null>(null);
    const [addingNetwork, setAddingNetwork] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [addingToken, setAddingToken] = useState(false);
    const [mintingToken, setMintingToken] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined" && (window as any).ethereum?.on) {
        const eth = (window as any).ethereum;
        const reload = () => window.location.reload();
        eth.on("chainChanged", reload);
        eth.on("accountsChanged", reload);
        return () => {
            try {
            eth.removeListener?.("chainChanged", reload);
            eth.removeListener?.("accountsChanged", reload);
            } catch {}
        };
        }
    }, []);

    const connectWallet = async () => {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        if (!provider) return;

        const accounts = await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        const response = await axios.post("http://localhost:3001/api/wallet/challenge", {
            address,
        });
        const { challengeId, challenge } = response.data;

        const signature = await signer.signMessage(challenge);

        const verifyResponse = await axios.post("http://localhost:3001/api/wallet/login", {
            address,
            challengeId,
            signature,
        });

        const success = verifyResponse.data.success;
        const chainId = await provider.send("eth_chainId", []);

        if (success) {
            setAccount(accounts[0]);
            setConnected(true);
            setNetwork(chainId);
        }
    };

    const checkNetwork = (eth: any) => {
        if (!connected) return false;
        if (!eth?.request) {
            setAddError("Ethereum wallet not detected");
            return false;
        }
        return true;
    };

    const addNetwork = async () => {
        const eth = (window as any).ethereum;
        if (checkNetwork(eth) === false) return;

        setAddingNetwork(true);
        setAddError(null);
        try {
            // If already on the target chain, just inform user.
            const currentId = await eth.request({ method: "eth_chainId" });
            if (
                typeof currentId === "string" &&
                currentId.toLowerCase() === NETWORK_PARAMS.chainId.toLowerCase()
            ) {
                setAddError("This network has been added");
            } else {
                // Try to switch first; if not added, MetaMask throws 4902
                await eth.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: NETWORK_PARAMS.chainId }],
                });
                setAddError("This network has been added");
            }
        } catch (switchErr: any) {
            if (switchErr?.code === 4902) {
                try {
                    await eth.request({
                        method: "wallet_addEthereumChain",
                        params: [NETWORK_PARAMS],
                    });
                    // Successfully added; no disconnect needed
                    setAddError(null);
                } catch (addErr: any) {
                    setAddError(addErr?.message || "Failed to add network");
                }
            } else if (switchErr?.code === 4001) {
                setAddError("User rejected network switch");
            } else {
                setAddError(switchErr?.message || "Failed to switch network");
            }
        } finally {
            setAddingNetwork(false);
        }
    };

    const addToken = async () => {
        const eth = (window as any).ethereum;
        if(checkNetwork(eth) === false) return;
        setAddError(null);
        setAddingToken(true);
        try {
            await eth.request({
                method: 'wallet_watchAsset',
                params: TOKEN_PARAMS,
            });
        } catch (err: any) {
            if (err?.code === 4001) {
                setAddError("User rejected token addition");
            } else {
                setAddError(err?.message || "Failed to add token");
            }
        } finally {
            setAddingToken(false);
        }
    };

    const mintToken = async () => {
        const eth = (window as any).ethereum;
        if(checkNetwork(eth) === false) return;
        setAddError(null);
        setMintingToken(true);
        try {
            const provider = new ethers.BrowserProvider(eth);
            const code = await provider.getCode(CONTRACT_ADDRESS);
            if (code === "0x") {
                setAddError("Token contract not found. Please add and switch to the correct network first");
                return;
            }
            
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(
                CONTRACT_ADDRESS,
                ABI,
                signer
            );

            try{
                await contract.mintToken.staticCall();
            }catch(err: any) {
                setAddError("Please wait a minute before claiming again.");
                return;
            }
            
            const tx = await contract.mintToken();
            const receipt = await tx.wait();
            console.log("Minted token, transaction receipt:", receipt);

        } catch (err: any) {
            setAddError(err?.message || "Token mint failed");
        }finally {
            setMintingToken(false);
        }
    }

    const disconnectWallet = async () => {
        setAccount(null);
        setConnected(false);
        setNetwork(null);
    };

    const shortAddr = (addr?: string | null) =>
        addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

    return (
        <div className="w-full">
            <header className="w-full border-b border-black/10 bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-black"/>
                        <span className="text-lg font-bold">1691</span>
                    </div>
                    <nav className="hidden gap-8 text-sm text-zinc-600 md:flex">
                        <a className="hover:text-black" href="#">Features</a>
                        <a className="hover:text-black" href="#">Learn more</a>
                        <a className="hover:text-black" href="#">Support</a>
                    </nav>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={connected ? disconnectWallet: connectWallet}
                            className="rounded-full bg-black px-3 py-1 text-sm text-white hover:bg-black/80"
                        >
                            {connected ? shortAddr(account): "Connect Wallet"}
                        </button>
                    </div>
                </div>
            </header>

            <section className="w-full">
                <div className="mx-auto w-full max-w-6xl px-6">
                    <div
                        className="w-full rounded-md"
                        style={{
                            backgroundImage: `url(${(bgImg as any).src || (bgImg as unknown as { src: string }).src})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                        }}
                    >
                        <div className="mx-auto flex max-w-5xl flex-col items-center py-16 text-center">
                            <div className="text-sm text-zinc-500">@powered by polkadot</div>
                            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold text-black md:text-6xl">
                                Claim Testnet Token
                                <br/>Platform
                            </h1>
                            {connected && (
                                <p className="mt-2 text-sm font-medium text-zinc-700">Only one claim per minute</p>
                            )}
                            <div className="mt-6 flex gap-3">
                                {!connected ? (
                                    <>
                                    <p className="mt-2 text-sm font-medium text-zinc-700">  </p>
                                    <button
                                        onClick={connectWallet}
                                        className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-black/80"
                                    >
                                        Connect Wallet
                                    </button>
                                    </>

                                ) : (
                                    <>
                                        <button
                                            onClick={addNetwork}
                                            disabled={addingNetwork}
                                            className="h-10 w-36 rounded-md border border-black text-black hover:bg-black/5 disabled:opacity-60"
                                        >
                                            {addingNetwork ? "Adding..." : "Add Network"}
                                        </button>
                                        <button
                                            onClick={addToken}
                                            disabled={addingToken}
                                            className="h-10 w-36 rounded-md border border-black text-black hover:bg-black/5 disabled:opacity-60"
                                        >
                                            {addingToken ? "Processing..." : "Add Token"}
                                        </button>
                                    </>
                                )}
                            </div>
                            {connected && (
                                <div className="mt-4">
                                    <button
                                        onClick={mintToken}
                                        disabled={mintingToken}
                                        className="h-10 w-36 rounded-md bg-black text-sm text-white hover:bg-black/80 disabled:opacity-60"
                                    >
                                        {mintingToken ? "Claiming..." : "Claim Token"}
                                    </button>
                                </div>
                            )}
                            {addError && (
                                <div className="mt-3 text-sm text-red-600">{addError}</div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-6 py-12">
                <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-12">
                    <div className="md:col-span-6">
                        <h2 className="text-4xl font-bold leading-tight text-black">
                            The Information of
                            <br/>Testnet Token
                        </h2>
                    </div>

                    <div className="md:col-span-6 md:ml-auto md:max-w-md">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-4 text-sm text-zinc-700 shadow-sm">
                            <div className="mb-2 flex items-center gap-2 font-semibold text-black">
                                <span className="inline-block h-3 w-3 rounded-full bg-zinc-400"/>
                                Import  The  New  Network
                            </div>
                            <div>Chain Name : {NETWORK_PARAMS.chainName}</div>
                            <div>RPC URL : {NETWORK_PARAMS.rpcUrls[0]}</div>
                            <div>Chain Id : {parseInt(NETWORK_PARAMS.chainId, 16)}</div>
                            <div>Currency Symbol : {NETWORK_PARAMS.nativeCurrency.symbol}</div>
                            <div>Block Explorer Url : {NETWORK_PARAMS.blockExplorerUrls?.[0]}</div>
                        </div>

                        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-100 p-4 text-sm text-zinc-700 shadow-sm">
                            <div className="mb-2 flex items-center gap-2 font-semibold text-black">
                                <span className="inline-block h-3 w-3 rotate-45 rounded-sm bg-zinc-400"/>
                                Import  The  New  Token
                            </div>
                            <div>Chain : {NETWORK_PARAMS.chainName}</div>
                            <div>Address : {TOKEN_PARAMS.options.address}</div>
                            <div>Symbol : {TOKEN_PARAMS.options.symbol}</div>
                            <div>Decimals : {TOKEN_PARAMS.options.decimals}</div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
