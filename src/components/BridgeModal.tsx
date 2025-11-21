import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowRight, Loader2, CheckCircle, AlertCircle, ExternalLink, ChevronDown, Clock, ArrowLeftRight } from 'lucide-react';
import { useAccount, useReadContract, usePublicClient, useSwitchChain } from 'wagmi';
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { sepolia } from 'viem/chains';
import confetti from 'canvas-confetti';
import { useBridge, type BridgeToken, type BridgeStep, CHAIN_TOKENS, SEPOLIA_CHAIN_ID, ARC_CHAIN_ID } from '../hooks/useBridge';

interface BridgeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  asPage?: boolean; // When true, renders as page content instead of modal
}

// Step labels for better UX - Setting expectations upfront
const STEP_LABELS: Record<BridgeStep, { title: string; description: string }> = {
  idle: { title: 'Ready', description: 'Enter amount to bridge' },
  'switching-network': {
    title: 'Switching Network',
    description: 'You will be asked to switch to Sepolia network in your wallet'
  },
  approving: {
    title: 'Bridge In Progress',
    description: 'You will be asked to: (1) Approve USDC spend, (2) Confirm the transfer transaction, and (3) Confirm the receive message. Please approve each transaction in your wallet as they appear.'
  },
  'signing-bridge': {
    title: 'Bridge In Progress',
    description: 'You will be asked to: (1) Approve USDC spend, (2) Confirm the transfer transaction, and (3) Confirm the receive message. Please approve each transaction in your wallet as they appear.'
  },
  'waiting-receive-message': {
    title: 'Bridge In Progress',
    description: 'You will be asked to: (1) Approve USDC spend, (2) Confirm the transfer transaction, and (3) Confirm the receive message. Please approve each transaction in your wallet as they appear.'
  },
  success: { title: 'Bridge Successful', description: 'Your USDC has been successfully transferred to Arc Testnet!' },
  error: { title: 'Bridge Failed', description: 'Bridge transaction failed. Please try again.' },
};

export type BridgeDirection = 'sepolia-to-arc' | 'arc-to-sepolia';

// Chain options for the selector (all supported chains)
const CHAIN_OPTIONS = [
  { id: 5042002, name: 'Arc Testnet', icon: '/Arc.png' },
  { id: 11155111, name: 'Ethereum Sepolia', icon: '/sepolia.png' },
  { id: 84532, name: 'Base Sepolia', icon: '/base.png' },
  { id: 421614, name: 'Arbitrum Sepolia', icon: '/arbitrum.png' },
  { id: 11155420, name: 'Optimism Sepolia', icon: '/optimism.png' },
  { id: 80002, name: 'Polygon Amoy', icon: '/polygon.png' },
  { id: 43113, name: 'Avalanche Fuji', icon: '/avalanche.png' },
  { id: 1301, name: 'Unichain Sepolia', icon: '/unichain.png' },
  { id: 4801, name: 'World Chain Sepolia', icon: '/worldchain.png' },
  { id: 763373, name: 'Ink Sepolia', icon: '/ink.png' },
  { id: 59141, name: 'Linea Sepolia', icon: '/linea.png' },
] as const;

// Chain explorer URLs
const CHAIN_EXPLORERS: Record<number, string> = {
  5042002: 'https://testnet.arcscan.app',
  11155111: 'https://sepolia.etherscan.io',
  84532: 'https://sepolia.basescan.org',
  421614: 'https://sepolia.arbiscan.io',
  11155420: 'https://sepolia-optimism.etherscan.io',
  80002: 'https://amoy.polygonscan.com',
  43113: 'https://testnet.snowtrace.io',
  1301: 'https://sepolia.uniscan.xyz',
  4801: 'https://worldchain-sepolia.explorer.alchemy.com',
  763373: 'https://explorer-sepolia.inkonchain.com',
  59141: 'https://sepolia.lineascan.build',
};

const TOKEN_OPTIONS: { symbol: BridgeToken; name: string; description: string; icon: string }[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    description: 'Dollar-pegged stablecoin',
    icon: '/usdc.svg',
  },
];

export default function BridgeModal({ isOpen = true, onClose, asPage = false }: BridgeModalProps) {
  const { address, isConnected, chainId } = useAccount();

  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<BridgeToken>('USDC');
  const [selectedChainId, setSelectedChainId] = useState<number>(11155111); // The other chain (not Arc)
  const [direction, setDirection] = useState<BridgeDirection>('sepolia-to-arc');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [bridgeStartTime, setBridgeStartTime] = useState<number | null>(null);
  const [isChainSelectorOpen, setIsChainSelectorOpen] = useState(false);

  const selectedTokenMeta = TOKEN_OPTIONS.find((token) => token.symbol === selectedToken);
  const selectedTokenIcon = selectedTokenMeta?.icon ?? '/usdc.svg';

  const {
    state,
    bridge,
    reset,
    isOnSepolia,
    isOnArc,
    currentChainId,
  } = useBridge();

  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();

  // Calculate source and destination chain IDs BEFORE useEffects that use them
  // Use stored direction from bridge state if available (for success screen), otherwise use current direction
  const activeDirection = state.direction || direction;

  // For success screen, use stored chain IDs from state if available
  // Otherwise calculate from current selection
  const sourceChainId = state.sourceChainId || (activeDirection === 'sepolia-to-arc' ? selectedChainId : ARC_CHAIN_ID);
  const destinationChainId = state.destinationChainId || (activeDirection === 'sepolia-to-arc' ? ARC_CHAIN_ID : selectedChainId);
  const sourceChainName = CHAIN_OPTIONS.find(c => c.id === sourceChainId)?.name || 'Unknown Chain';
  const destinationChainName = CHAIN_OPTIONS.find(c => c.id === destinationChainId)?.name || 'Unknown Chain';

  // Update direction when selected chain changes
  useEffect(() => {
    // Direction is always relative to Arc Testnet
    // If direction is 'sepolia-to-arc', Arc is destination
    // If direction is 'arc-to-sepolia', Arc is source
  }, [selectedChainId, direction]);

  // Auto-detect selected chain based on current chain when component mounts
  useEffect(() => {
    if ((asPage || isOpen) && currentChainId && state.step !== 'success') {
      if (currentChainId === ARC_CHAIN_ID) {
        // If on Arc, default to Sepolia as the other chain, direction from Arc
        setSelectedChainId(11155111);
        setDirection('arc-to-sepolia');
      } else if (CHAIN_OPTIONS.some(chain => chain.id === currentChainId)) {
        // If on one of the supported chains, select it, direction to Arc
        setSelectedChainId(currentChainId);
        setDirection('sepolia-to-arc');
      }
    }
  }, [isOpen, asPage, currentChainId, state.step]);

  // Smart auto-switch: only when user manually changes selectedChainId and wallet is on wrong network
  // This ensures balance is visible but doesn't cause infinite loops
  useEffect(() => {
    // Only auto-switch if:
    // 1. User is connected
    // 2. Not currently bridging
    // 3. Direction is 'sepolia-to-arc' (meaning selectedChainId is the source)
    // 4. Wallet is not already on the selected chain
    if (isConnected && !state.isLoading && direction === 'sepolia-to-arc' && chainId !== selectedChainId) {
      // Small delay to avoid rapid switches
      const timer = setTimeout(() => {
        switchChain?.({ chainId: selectedChainId });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedChainId, direction, chainId, isConnected, switchChain, state.isLoading]);

  // Swap direction function
  const handleSwapDirection = () => {
    setDirection(direction === 'sepolia-to-arc' ? 'arc-to-sepolia' : 'sepolia-to-arc');
  };

  // Get token info for source chain
  const sourceTokenInfo = CHAIN_TOKENS[sourceChainId]?.[selectedToken];
  const destinationTokenInfo = CHAIN_TOKENS[destinationChainId]?.[selectedToken];

  // ERC20 ABI for balanceOf
  const ERC20_ABI = [
    {
      constant: true,
      inputs: [{ name: '_owner', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: 'balance', type: 'uint256' }],
      type: 'function',
    },
  ] as const;

  // Fetch balance from source chain using useReadContract (RainbowKit approach)
  // This automatically watches the chain and updates when connected to that chain
  const { data: sourceBalanceRaw, isLoading: isLoadingSourceBalance } = useReadContract({
    address: (sourceTokenInfo?.contractAddress && isConnected && address && currentChainId === sourceChainId) ? sourceTokenInfo.contractAddress as Address : undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && !!sourceTokenInfo && currentChainId === sourceChainId,
      // Refresh every 5 seconds
      refetchInterval: 5000,
    },
  });

  // For source chain when not connected to it, use separate publicClient
  const sourcePublicClient = useMemo(() => {
    if (currentChainId === sourceChainId || !sourceTokenInfo) return null; // Use wagmi when connected

    if (sourceChainId === SEPOLIA_CHAIN_ID) {
      return createPublicClient({
        chain: sepolia,
        transport: http('https://ethereum-sepolia-rpc.publicnode.com', {
          retryCount: 2,
          timeout: 8000,
        }),
      });
    } else if (sourceChainId === ARC_CHAIN_ID) {
      return createPublicClient({
        chain: {
          id: ARC_CHAIN_ID,
          name: 'Arc Testnet',
          network: 'arc-testnet',
          nativeCurrency: {
            decimals: 6,
            name: 'USDC',
            symbol: 'USDC',
          },
          rpcUrls: {
            default: { http: ['https://rpc.testnet.arc.network'] },
            public: { http: ['https://rpc.testnet.arc.network'] },
          },
          blockExplorers: {
            default: { name: 'Arc Explorer', url: 'https://testnet.arcscan.app' },
          },
        },
        transport: http('https://rpc.testnet.arc.network', {
          retryCount: 2,
          timeout: 8000,
        }),
      });
    }
    return null;
  }, [sourceChainId, sourceTokenInfo, currentChainId]);

  // Fetch source balance when not connected to source chain
  const [sourceBalanceManual, setSourceBalanceManual] = useState<string>('0');
  const [isLoadingSourceBalanceManual, setIsLoadingSourceBalanceManual] = useState(false);

  useEffect(() => {
    // Only fetch manually if we're not connected to the source chain
    if (currentChainId === sourceChainId || !sourcePublicClient || !address || !sourceTokenInfo) {
      setSourceBalanceManual('0');
      return;
    }

    let isCancelled = false;
    setIsLoadingSourceBalanceManual(true);

    const fetchSourceBalance = async () => {
      try {
        const balance = await sourcePublicClient.readContract({
          address: sourceTokenInfo.contractAddress as Address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        });

        if (!isCancelled) {
          const formatted = formatUnits(balance as bigint, sourceTokenInfo.decimals);
          setSourceBalanceManual(formatted);
        }
      } catch (err) {
        console.error('Error fetching source balance:', err);
        if (!isCancelled) {
          setSourceBalanceManual('0');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSourceBalanceManual(false);
        }
      }
    };

    fetchSourceBalance();
    // Refresh every 5 seconds
    const interval = setInterval(fetchSourceBalance, 5000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [sourcePublicClient, address, sourceTokenInfo, currentChainId, sourceChainId]);

  // For destination chain, we need to use a separate publicClient since we might not be connected to it
  // Create a public client for the destination chain
  const destinationPublicClient = useMemo(() => {
    if (!destinationTokenInfo) return null;

    if (destinationChainId === SEPOLIA_CHAIN_ID) {
      return createPublicClient({
        chain: sepolia,
        transport: http('https://ethereum-sepolia-rpc.publicnode.com', {
          retryCount: 2,
          timeout: 8000,
        }),
      });
    } else if (destinationChainId === ARC_CHAIN_ID) {
      return createPublicClient({
        chain: {
          id: ARC_CHAIN_ID,
          name: 'Arc Testnet',
          network: 'arc-testnet',
          nativeCurrency: {
            decimals: 6,
            name: 'USDC',
            symbol: 'USDC',
          },
          rpcUrls: {
            default: { http: ['https://rpc.testnet.arc.network'] },
            public: { http: ['https://rpc.testnet.arc.network'] },
          },
          blockExplorers: {
            default: { name: 'Arc Explorer', url: 'https://testnet.arcscan.app' },
          },
        },
        transport: http('https://rpc.testnet.arc.network', {
          retryCount: 2,
          timeout: 8000,
        }),
      });
    }
    return null;
  }, [destinationChainId, destinationTokenInfo]);

  // Fetch destination balance using the separate publicClient
  const [destinationBalance, setDestinationBalance] = useState<string>('0');
  const [isLoadingDestinationBalance, setIsLoadingDestinationBalance] = useState(false);

  useEffect(() => {
    if (!destinationPublicClient || !address || !destinationTokenInfo) {
      setDestinationBalance('0');
      return;
    }

    let isCancelled = false;
    setIsLoadingDestinationBalance(true);

    const fetchDestinationBalance = async () => {
      try {
        const balance = await destinationPublicClient.readContract({
          address: destinationTokenInfo.contractAddress as Address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        });

        if (!isCancelled) {
          const formatted = formatUnits(balance as bigint, destinationTokenInfo.decimals);
          setDestinationBalance(formatted);
        }
      } catch (err) {
        console.error('Error fetching destination balance:', err);
        if (!isCancelled) {
          setDestinationBalance('0');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDestinationBalance(false);
        }
      }
    };

    fetchDestinationBalance();
    // Refresh every 5 seconds
    const interval = setInterval(fetchDestinationBalance, 5000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [destinationPublicClient, address, destinationTokenInfo]);

  // Format source balance - use wagmi when connected to source chain, otherwise use manual fetch
  const tokenBalance = useMemo(() => {
    if (currentChainId === sourceChainId) {
      // Use wagmi result when connected to source chain
      if (!sourceBalanceRaw || !sourceTokenInfo) return '0';
      return formatUnits(sourceBalanceRaw as bigint, sourceTokenInfo.decimals);
    } else {
      // Use manual fetch result when not connected to source chain
      return sourceBalanceManual;
    }
  }, [currentChainId, sourceChainId, sourceBalanceRaw, sourceTokenInfo, sourceBalanceManual]);

  const isLoadingBalance = currentChainId === sourceChainId ? isLoadingSourceBalance : isLoadingSourceBalanceManual;
  const balanceError = '';

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen && !asPage) {
      setAmount('');
      reset();
    }
  }, [isOpen, asPage, reset]);

  // Timer effect during bridging - starts when isLoading becomes true
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (state.isLoading) {
      // Start timer when bridge begins
      if (!bridgeStartTime) {
        setBridgeStartTime(Date.now());
        setElapsedTime(0);
      }

      interval = setInterval(() => {
        if (bridgeStartTime) {
          const elapsed = Math.floor((Date.now() - bridgeStartTime) / 1000);
          setElapsedTime(elapsed);
        }
      }, 1000);
    } else {
      // Reset timer when bridge completes or errors
      setElapsedTime(0);
      setBridgeStartTime(null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.isLoading, bridgeStartTime]);

  // Confetti effect - only trigger when receive message transaction is confirmed
  // This means the bridge is fully complete, not just when source transaction is done
  // Only show confetti if transaction is successful (not rejected/cancelled)
  useEffect(() => {
    // Only trigger confetti when:
    // 1. State is success (not error)
    // 2. We have a receiveTxHash (receive message is confirmed)
    // 3. We're not in error state
    // 4. Ensure we're not in a loading state (shouldn't happen but defensive)
    if (
      state.step === 'success' &&
      state.receiveTxHash &&
      !state.error &&
      !state.isLoading
    ) {
      // Trigger confetti animation
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: NodeJS.Timeout = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        // Launch from left side
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });

        // Launch from right side
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      // Cleanup
      return () => clearInterval(interval);
    }
  }, [state.step, state.receiveTxHash, state.error, state.isLoading]);

  const handleBridge = async () => {
    await bridge(selectedToken, amount, direction, sourceChainId, destinationChainId);
  };

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    reset();
    setAmount('');
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen && !asPage) return null;

  const content = (
    <div className={`${asPage ? 'w-full max-w-2xl mx-auto px-4' : ''}`}>
      <motion.div

        className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 border border-orange-200 dark:border-gray-700 shadow-xl relative overflow-hidden transition-colors duration-200"
        style={{
          boxShadow: `
            0 0 20px rgba(251, 146, 60, 0.15),
            0 0 40px rgba(251, 146, 60, 0.1),
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.9)
          `
        }}
        initial={asPage ? { opacity: 0, y: 20 } : { opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 relative z-10">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Bridge Tokens</h2>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-300 mt-1">
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium mr-2">Cross-Chain</span>
              <span className="hidden sm:inline">Transfer USDC between Sepolia and Arc Testnet</span>
              <span className="sm:hidden">Sepolia ↔ Arc Testnet</span>
            </p>
          </div>
          {!asPage && (
            <motion.button
              onClick={handleClose}
              className="w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </motion.button>
          )}
        </div>

        {/* Content */}
        <div className="relative z-10">
          {state.step === 'idle' && (
            <div className="space-y-6">
              {/* Chain Selection: Arc Fixed + Direction Swap */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                  {/* Source Chain (Arc or Selected) */}
                  <div className="text-center flex-1 w-full sm:w-auto">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">From</p>
                    {direction === 'arc-to-sepolia' ? (
                      // Arc is source
                      <div className="flex items-center justify-center space-x-2 mb-1 px-3 py-2">
                        <img
                          src="/Arc.png"
                          alt="Arc Testnet"
                          className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Arc Testnet</p>
                      </div>
                    ) : (
                      // Selected chain is source
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsChainSelectorOpen(!isChainSelectorOpen)}
                          disabled={state.isLoading}
                          className="flex items-center justify-center space-x-2 mb-1 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 hover:border-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                        >
                          <img
                            src={CHAIN_OPTIONS.find(c => c.id === selectedChainId)?.icon || '/sepolia.png'}
                            alt={CHAIN_OPTIONS.find(c => c.id === selectedChainId)?.name || 'Chain'}
                            className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <p className="font-bold text-gray-900 text-sm sm:text-base">
                            {CHAIN_OPTIONS.find(c => c.id === selectedChainId)?.name || 'Select Chain'}
                          </p>
                          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isChainSelectorOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown */}
                        {isChainSelectorOpen && (
                          <div className="absolute z-50 mt-2 w-full sm:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden left-0">
                            {CHAIN_OPTIONS.filter(c => c.id !== ARC_CHAIN_ID).map((chain) => (
                              <button
                                key={chain.id}
                                type="button"
                                onClick={() => {
                                  setSelectedChainId(chain.id);
                                  setIsChainSelectorOpen(false);
                                }}
                                className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors ${selectedChainId === chain.id ? 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500' : ''
                                  }`}
                              >
                                <img
                                  src={chain.icon}
                                  alt={chain.name}
                                  className="w-6 h-6 object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                <div className="text-left flex-1">
                                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{chain.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Chain ID: {chain.id}</p>
                                </div>
                                {selectedChainId === chain.id && (
                                  <CheckCircle className="w-5 h-5 text-orange-500" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
                      Chain ID: {direction === 'arc-to-sepolia' ? ARC_CHAIN_ID : selectedChainId}
                    </p>
                  </div>

                  {/* Swap Direction Button */}
                  <button
                    type="button"
                    onClick={handleSwapDirection}
                    disabled={state.isLoading}
                    className="p-2 sm:mx-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed rotate-90 sm:rotate-0"
                    title="Swap direction"
                  >
                    <ArrowLeftRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>

                  {/* Destination Chain (Selected or Arc) */}
                  <div className="text-center flex-1 w-full sm:w-auto">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">To</p>
                    {direction === 'sepolia-to-arc' ? (
                      // Arc is destination
                      <div className="flex items-center justify-center space-x-2 mb-1 px-3 py-2">
                        <img
                          src="/Arc.png"
                          alt="Arc Testnet"
                          className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Arc Testnet</p>
                      </div>
                    ) : (
                      // Selected chain is destination - make it selectable
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsChainSelectorOpen(!isChainSelectorOpen)}
                          disabled={state.isLoading}
                          className="flex items-center justify-center space-x-2 mb-1 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 hover:border-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                        >
                          <img
                            src={CHAIN_OPTIONS.find(c => c.id === selectedChainId)?.icon || '/sepolia.png'}
                            alt={CHAIN_OPTIONS.find(c => c.id === selectedChainId)?.name || 'Chain'}
                            className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <p className="font-bold text-gray-900 text-sm sm:text-base">
                            {CHAIN_OPTIONS.find(c => c.id === selectedChainId)?.name || 'Select Chain'}
                          </p>
                          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isChainSelectorOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown */}
                        {isChainSelectorOpen && (
                          <div className="absolute z-50 mt-2 w-full sm:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden right-0">
                            {CHAIN_OPTIONS.filter(c => c.id !== ARC_CHAIN_ID).map((chain) => (
                              <button
                                key={chain.id}
                                type="button"
                                onClick={() => {
                                  setSelectedChainId(chain.id);
                                  setIsChainSelectorOpen(false);
                                }}
                                className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors ${selectedChainId === chain.id ? 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500' : ''
                                  }`}
                              >
                                <img
                                  src={chain.icon}
                                  alt={chain.name}
                                  className="w-6 h-6 object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                <div className="text-left flex-1">
                                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{chain.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Chain ID: {chain.id}</p>
                                </div>
                                {selectedChainId === chain.id && (
                                  <CheckCircle className="w-5 h-5 text-orange-500" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                      Chain ID: {direction === 'sepolia-to-arc' ? ARC_CHAIN_ID : selectedChainId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Faucet Callout */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Need testnet USDC or gas?</p>
                  <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                    Grab {CHAIN_OPTIONS.find(c => c.id === selectedChainId)?.name} native token for gas and USDC before bridging.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={(() => {
                      switch (selectedChainId) {
                        case 11155111: return 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia';
                        case 84532: return 'https://www.alchemy.com/faucets/base-sepolia';
                        case 421614: return 'https://faucet.quicknode.com/arbitrum/sepolia';
                        case 11155420: return 'https://faucet.quicknode.com/optimism/sepolia';
                        case 80002: return 'https://faucet.polygon.technology/';
                        case 43113: return 'https://core.app/tools/testnet-faucet/';
                        case 1301: return 'https://docs.unichain.org/docs/user-guides/faucet';
                        case 4801: return 'https://worldcoin.org/world-chain';
                        case 763373: return 'https://inkonchain.com/faucet';
                        case 59141: return 'https://faucet.linea.build/';
                        default: return 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia';
                      }
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-blue-900 text-blue-700 dark:text-blue-100 border border-blue-200 dark:border-blue-700 hover:border-blue-400 transition"
                  >
                    {(() => {
                      switch (selectedChainId) {
                        case 11155111: return 'Sepolia ETH Faucet';
                        case 84532: return 'Base Sepolia ETH Faucet';
                        case 421614: return 'Arbitrum Sepolia ETH Faucet';
                        case 11155420: return 'OP Sepolia ETH Faucet';
                        case 80002: return 'Amoy POL Faucet';
                        case 43113: return 'Fuji AVAX Faucet';
                        case 1301: return 'Unichain ETH Faucet';
                        case 4801: return 'World Chain ETH Faucet';
                        case 763373: return 'Ink ETH Faucet';
                        case 59141: return 'Linea ETH Faucet';
                        default: return 'ETH Faucet';
                      }
                    })()}
                  </a>
                  <a
                    href="https://faucet.circle.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 transition"
                  >
                    USDC Faucet
                  </a>
                </div>
              </div>

              {/* Token Selection - Hidden (Defaulting to USDC) */}
              <div className="hidden">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Token
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {TOKEN_OPTIONS.map((token) => {
                    const isActive = selectedToken === token.symbol;
                    return (
                      <button
                        key={token.symbol}
                        type="button"
                        onClick={() => setSelectedToken(token.symbol)}
                        disabled={state.isLoading}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${isActive
                          ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-500 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-200 dark:hover:border-gray-600'
                          } ${state.isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <img
                          src={token.icon}
                          alt={token.name}
                          className="w-8 h-8"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{token.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{token.description}</p>
                        </div>
                        {isActive && (
                          <div className="ml-auto">
                            <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Bridge Kit supports USDC and EURC for bidirectional bridging between Sepolia and Arc Testnet.
                </p>
              </div>

              {/* Token Balance Display */}
              {isConnected && address && (
                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-xl p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <img
                        src={selectedTokenIcon}
                        alt={selectedTokenMeta?.name || selectedToken}
                        className="w-5 h-5"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div>
                        <p className="text-xs text-orange-700 dark:text-orange-300 font-medium mb-1">{sourceChainName} {selectedToken} Balance</p>
                        {isLoadingBalance ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
                            <span className="text-sm text-orange-800">Loading...</span>
                          </div>
                        ) : (
                          <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                            {parseFloat(tokenBalance) > 0
                              ? `${parseFloat(tokenBalance).toFixed(2)} ${selectedToken}`
                              : `0.00 ${selectedToken}`
                            }
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      {CHAIN_TOKENS[sourceChainId] && (
                        <p className="text-xs text-orange-600 font-mono break-all">
                          {CHAIN_TOKENS[sourceChainId][selectedToken].contractAddress.slice(0, 6)}...{CHAIN_TOKENS[sourceChainId][selectedToken].contractAddress.slice(-4)}
                        </p>
                      )}
                    </div>
                  </div>
                  {balanceError && (
                    <div className="mt-2 pt-2 border-t border-orange-200">
                      <p className="text-xs text-amber-600">
                        ⚠️ {balanceError}
                      </p>
                    </div>
                  )}
                  {parseFloat(tokenBalance) === 0 && !isLoadingBalance && !balanceError && (
                    <div className="mt-3 pt-3 border-t border-orange-200">
                      <p className="text-xs text-orange-700 mb-2">
                        ⚠️ You need {selectedToken} at the Bridge Kit contract address to bridge
                      </p>
                      <a
                        href="https://faucet.circle.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                      >
                        <span>Get {selectedToken} on Sepolia here</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount ({selectedToken})
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-base sm:text-lg"
                  disabled={state.isLoading}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the amount to bridge to {destinationChainName}
                </p>
              </div>

              {/* Warning if not on source chain */}
              {isConnected && chainId !== sourceChainId && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Auto-switch to {sourceChainName}</p>
                      <p className="text-xs mt-1">
                        Bridge Kit will automatically switch your network to {sourceChainName} when you start the bridge process.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Connect Wallet Prompt */}
              {!isConnected && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-blue-800">
                    Please connect your wallet to bridge tokens
                  </p>
                </div>
              )}

              {/* Bridge Button */}
              <button
                onClick={handleBridge}
                disabled={!isConnected || !amount || parseFloat(amount) <= 0 || state.isLoading}
                className={`w-full py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 ${!isConnected || !amount || parseFloat(amount) <= 0 || state.isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-lg active:scale-95'
                  }`}
              >
                {state.isLoading ? 'Processing...' : `Bridge ${selectedToken}`}
              </button>
            </div>
          )}

          {/* Bridge In Progress - Simplified with Timer */}
          {(state.step !== 'idle' && state.step !== 'success' && state.step !== 'error') && (
            <div className="space-y-6">
              {/* Timer and Spinner */}
              <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border border-gray-200 text-center">
                <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 text-orange-500 animate-spin mx-auto mb-4" />

                {/* Timer Display */}
                <div className="mb-4">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Bridge in Progress</p>
                  <div className="flex items-center justify-center space-x-2">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 font-mono">
                      {formatTime(elapsedTime)}
                    </p>
                  </div>
                </div>

                {/* Status Message */}
                <div className="space-y-2">
                  <p className="text-base sm:text-lg font-bold text-gray-900">
                    {state.step === 'switching-network'
                      ? 'Switching Network'
                      : 'Processing Bridge'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    {state.step === 'switching-network'
                      ? `You will be asked to switch to ${sourceChainName} network in your wallet.`
                      : `You will be asked to approve transactions in your wallet. Please approve each transaction as it appears. The bridge will automatically handle the transfer and receive message confirmation.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {state.step === 'success' && (
            <div className="space-y-4 text-center relative z-10">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">Bridge Successful!</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Your {selectedToken} has been successfully transferred from {sourceChainName} to {destinationChainName}.
                </p>

                {/* Transaction Links */}
                <div className="grid gap-3 sm:grid-cols-2 mb-4">
                  {state.sourceTxHash && (
                    <a
                      href={`${CHAIN_EXPLORERS[sourceChainId] || 'https://sepolia.etherscan.io'}/tx/${state.sourceTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 rounded-2xl border border-orange-100 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 px-4 py-3 text-sm font-semibold text-orange-700 dark:text-orange-400 hover:border-orange-300 dark:hover:border-orange-700 transition"
                    >
                      <span>View {sourceChainName} Tx</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {state.receiveTxHash ? (
                    <a
                      href={`${CHAIN_EXPLORERS[destinationChainId] || 'https://sepolia.etherscan.io'}/tx/${state.receiveTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 rounded-2xl border border-orange-100 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 px-4 py-3 text-sm font-semibold text-orange-700 dark:text-orange-400 hover:border-orange-300 dark:hover:border-orange-700 transition"
                    >
                      <span>View Receive Message Tx</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                      <p>Receive message transaction hash will be available after confirmation.</p>
                      <p className="mt-1">Check the browser console for details or {destinationChainName} explorer later.</p>
                    </div>
                  )}
                </div>
                {!state.sourceTxHash && !state.receiveTxHash && state.result && (state.result as any)?.txHash && (
                  <a
                    href={`${CHAIN_EXPLORERS[sourceChainId] || 'https://sepolia.etherscan.io'}/tx/${(state.result as any).txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded-2xl border border-orange-100 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 px-4 py-3 text-sm font-semibold text-orange-700 dark:text-orange-400 hover:border-orange-300 dark:hover:border-orange-700 transition"
                  >
                    <span>View Transaction</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              <motion.button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClose();
                }}
                className="mt-4 w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3 bg-orange-500 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-orange-600 active:bg-orange-700 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed relative z-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
              >
                Close
              </motion.button>
            </div>
          )}

          {/* Error */}
          {state.step === 'error' && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">Bridge Failed</p>
                <div className="text-sm text-red-600 mb-4 max-h-40 overflow-y-auto text-left bg-red-50 p-3 rounded-lg">
                  <p className="whitespace-pre-wrap break-words">{state.error}</p>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Check the browser console for detailed {selectedToken} contract address information.
                </p>
                <motion.button
                  onClick={() => {
                    reset();
                    setAmount('');
                  }}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3 bg-orange-500 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-orange-600 active:bg-orange-700 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Try Again
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );

  if (asPage) {
    return content;
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={handleClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </motion.div>
  );
}


