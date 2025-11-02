import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { formatUnits, type Address } from 'viem';
import { POOL_ABI, ERC20_ABI } from '../config/abis';
import { useDEX, TOKENS, type TokenSymbol } from '../hooks/useDEX';
import TokenLogo from './TokenLogo';

interface RemoveLiquidityModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolAddress: Address;
  tokenA: Address;
  tokenB: Address;
  tokenASymbol: string;
  tokenBSymbol: string;
}

export default function RemoveLiquidityModal({
  isOpen,
  onClose,
  poolAddress,
  tokenA,
  tokenB,
  tokenASymbol,
  tokenBSymbol,
}: RemoveLiquidityModalProps) {
  const { isConnected, address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const isArcTestnet = chainId === 5042002;

  const [lpAmount, setLpAmount] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [removalSuccess, setRemovalSuccess] = useState(false);

  // Get LP balance
  const { data: lpBalance } = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!poolAddress && !!address && isConnected },
  });

  const lpBalanceStr = lpBalance ? formatUnits(lpBalance, 18) : '0';

  // Get total supply
  const { data: totalSupply } = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'totalSupply',
    query: { enabled: !!poolAddress },
  });

  // IMPORTANT: Read actual token balances from ERC20 contracts, not stored reserves
  // This matches the indexer's approach and ensures accurate on-chain data
  // Stored reserves (pool.reserveA/reserveB) might be stale if _update() wasn't called
  const { data: reserveA } = useReadContract({
    address: tokenA,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: poolAddress ? [poolAddress] : undefined,
    query: { enabled: !!poolAddress && !!tokenA },
  });

  const { data: reserveB } = useReadContract({
    address: tokenB,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: poolAddress ? [poolAddress] : undefined,
    query: { enabled: !!poolAddress && !!tokenB },
  });

  // Get token decimals
  const tokenADecimals = useMemo(() => {
    const tokenEntry = Object.entries(TOKENS).find(
      ([_, info]) => info.address.toLowerCase() === tokenA.toLowerCase()
    );
    return tokenEntry ? tokenEntry[1].decimals : 18;
  }, [tokenA]);

  const tokenBDecimals = useMemo(() => {
    const tokenEntry = Object.entries(TOKENS).find(
      ([_, info]) => info.address.toLowerCase() === tokenB.toLowerCase()
    );
    return tokenEntry ? tokenEntry[1].decimals : 18;
  }, [tokenB]);

  // Calculate amounts to receive
  const amountAReceive = useMemo(() => {
    if (!lpAmount || !totalSupply || !reserveA || parseFloat(lpAmount) <= 0 || parseFloat(totalSupply.toString()) <= 0) {
      return '0';
    }
    const lpAmountBig = BigInt(Math.floor(parseFloat(lpAmount) * 1e18));
    const amountA = (lpAmountBig * reserveA) / totalSupply;
    return formatUnits(amountA, tokenADecimals);
  }, [lpAmount, totalSupply, reserveA, tokenADecimals]);

  const amountBReceive = useMemo(() => {
    if (!lpAmount || !totalSupply || !reserveB || parseFloat(lpAmount) <= 0 || parseFloat(totalSupply.toString()) <= 0) {
      return '0';
    }
    const lpAmountBig = BigInt(Math.floor(parseFloat(lpAmount) * 1e18));
    const amountB = (lpAmountBig * reserveB) / totalSupply;
    return formatUnits(amountB, tokenBDecimals);
  }, [lpAmount, totalSupply, reserveB, tokenBDecimals]);

  const { removeLiquidity, isPending, isConfirming, isSuccess, error } = useDEX();

  // Format error message helper (memoized)
  const getErrorMessage = useMemo(() => {
    return (err: any): string => {
      if (!err) return 'Unknown error occurred';
      
      const errorStr = err.message || err.toString() || '';
      
      // Rate limiting errors (check first as it's common)
      if (errorStr.includes('rate limit') || 
          errorStr.includes('rate limited') ||
          errorStr.includes('Request is being rate limited') ||
          errorStr.includes('rate Limited')) {
        return 'The network is currently busy. Please wait a moment and try again.';
      }
      
      // User rejection errors
      if (errorStr.includes('User rejected') || 
          errorStr.includes('User denied') || 
          errorStr.includes('rejected the request') ||
          errorStr.includes('denied transaction signature')) {
        return 'Transaction was cancelled. Please try again when ready.';
      }
      
      // Invalid decimal number errors (for very small numbers)
      if (errorStr.includes('InvalidDecimalNumberError') || 
          errorStr.includes('not a valid decimal number') ||
          errorStr.includes('Number') && errorStr.includes('is not a valid decimal')) {
        return 'The LP amount is too small. Please enter a valid amount.';
      }
      
      // Network errors
      if (errorStr.includes('network') || errorStr.includes('Network')) {
        return 'Network error. Please check your connection and try again.';
      }
      
      // Gas errors
      if (errorStr.includes('gas') || errorStr.includes('insufficient funds')) {
        return 'Insufficient funds for gas. Please ensure you have enough balance.';
      }
      
      // Pool errors
      if (errorStr.includes('Pool not found') || errorStr.includes('pool')) {
        return 'Pool not found. Please check the pool address.';
      }
      
      // For technical errors, extract just the reason if available
      if (errorStr.includes('reverted with the following reason:')) {
        const reasonMatch = errorStr.match(/reverted with the following reason:\s*(.+?)(?:\.|Contract|$)/i);
        if (reasonMatch && reasonMatch[1]) {
          const reason = reasonMatch[1].trim();
          // Already handled rate limiting above, but check again for variations
          if (reason.includes('rate limit')) {
            return 'The network is currently busy. Please wait a moment and try again.';
          }
          // Return the clean reason without technical details
          return reason.charAt(0).toUpperCase() + reason.slice(1);
        }
      }
      
      return 'An unexpected error occurred. Please try again.';
    };
  }, []);

  // Track transaction progress and show progress modal
  useEffect(() => {
    if (isPending || isConfirming) {
      // Show progress modal when transaction starts
      if (!showProgressModal) {
        setShowProgressModal(true);
      }
    } else if (isSuccess && !isPending && !isConfirming) {
      // Show success state only when transaction is fully complete
      if (!removalSuccess) {
        setRemovalSuccess(true);
        // Close progress modal and main modal after delay
        setTimeout(() => {
          setShowProgressModal(false);
          setRemovalSuccess(false);
          setLpAmount('');
          onClose();
        }, 2500);
      }
    } else if (error && !isPending && !isConfirming && !isSuccess) {
      // Show error in progress modal only if not in pending/confirming state
      const errorMsg = getErrorMessage(error);
      if (errorMsg !== errorMessage) {
        setErrorMessage(errorMsg);
      }
      // Keep progress modal open to show error
      if (!showProgressModal) {
        setShowProgressModal(true);
      }
    }
  }, [isPending, isConfirming, isSuccess, error, showProgressModal, removalSuccess, errorMessage, onClose, getErrorMessage]);

  const handleRemoveLiquidity = async () => {
    if (!isConnected || !lpAmount || parseFloat(lpAmount) <= 0) return;

    setErrorMessage(null);

    try {
      // Find token symbols
      const tokenASymbolMatch = Object.entries(TOKENS).find(
        ([_, info]) => info.address.toLowerCase() === tokenA.toLowerCase()
      )?.[0] as TokenSymbol | undefined;

      const tokenBSymbolMatch = Object.entries(TOKENS).find(
        ([_, info]) => info.address.toLowerCase() === tokenB.toLowerCase()
      )?.[0] as TokenSymbol | undefined;

      if (!tokenASymbolMatch || !tokenBSymbolMatch) {
        setErrorMessage('Token symbols not found');
        return;
      }

      // Cap at available balance
      const maxBalance = parseFloat(lpBalanceStr);
      const requestedAmount = parseFloat(lpAmount);
      const finalAmount = Math.min(requestedAmount, maxBalance).toString();

      // Show progress modal before starting transaction
      setShowProgressModal(true);
      setErrorMessage(null);
      setRemovalSuccess(false);

      await removeLiquidity(tokenASymbolMatch, tokenBSymbolMatch, finalAmount);
    } catch (err: any) {
      console.error('Remove liquidity error:', err);
      setErrorMessage(getErrorMessage(err));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => {
          if (!isPending && !isConfirming) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide relative"
          style={{
            boxShadow: `
              0 0 30px rgba(251, 146, 60, 0.25),
              0 0 60px rgba(251, 146, 60, 0.15),
              0 10px 25px -5px rgba(0, 0, 0, 0.1),
              0 4px 6px -2px rgba(0, 0, 0, 0.05),
              inset 0 1px 0 rgba(255, 255, 255, 0.9)
            `
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Remove Liquidity</h3>
            {!isPending && !isConfirming && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Pool Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <TokenLogo token={tokenASymbol} size={40} />
                <TokenLogo token={tokenBSymbol} size={40} />
              </div>
              <div className="text-lg font-bold text-gray-900">
                {tokenASymbol} / {tokenBSymbol}
              </div>
            </div>
          </div>

          {/* LP Amount Input */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex-shrink-0">LP Tokens</label>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                Balance: {parseFloat(lpBalanceStr).toFixed(4)}
              </span>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <input
                type="number"
                value={lpAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = parseFloat(value);
                  const maxBalance = parseFloat(lpBalanceStr);
                  if (!isNaN(numValue) && numValue > maxBalance) {
                    setLpAmount(maxBalance.toString());
                    return;
                  }
                  setLpAmount(value);
                }}
                placeholder="0.0"
                max={parseFloat(lpBalanceStr)}
                step="any"
                className="w-full text-xl font-bold bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
              />
              <button
                onClick={() => setLpAmount(lpBalanceStr)}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium mt-1"
              >
                Max
              </button>
            </div>
          </div>

          {/* You'll Receive */}
          {lpAmount && parseFloat(lpAmount) > 0 && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">You'll Receive</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TokenLogo token={tokenASymbol} size={24} />
                    <span className="text-gray-600">{tokenASymbol}</span>
                  </div>
                  <span className="font-bold text-gray-900">{parseFloat(amountAReceive).toFixed(6)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TokenLogo token={tokenBSymbol} size={24} />
                    <span className="text-gray-600">{tokenBSymbol}</span>
                  </div>
                  <span className="font-bold text-gray-900">{parseFloat(amountBReceive).toFixed(6)}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  <strong>Note:</strong> These amounts are calculated based on your LP token share of the pool's reserves. 
                  If no trades have occurred since you added liquidity, you'll receive back approximately what you deposited (minus any fees).
                  Amounts may vary slightly due to rounding or pool fees.
                </p>
              </div>
            </div>
          )}

          {/* Error Message (only show if not in progress modal) */}
          {(errorMessage || error) && !showProgressModal && (
            <div className="mb-4 p-3 bg-red-50 rounded-xl border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium">Error</p>
                <p className="text-xs mt-1">{errorMessage || error?.message || 'Unknown error'}</p>
              </div>
            </div>
          )}

          {/* Remove Button */}
          <motion.button
            onClick={handleRemoveLiquidity}
            disabled={
              !isConnected ||
              !isArcTestnet ||
              !lpAmount ||
              parseFloat(lpAmount) <= 0 ||
              isPending ||
              isConfirming
            }
            className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              !isConnected ||
              !isArcTestnet ||
              !lpAmount ||
              parseFloat(lpAmount) <= 0 ||
              isPending ||
              isConfirming
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
            whileHover={
              !isConnected ||
              !isArcTestnet ||
              !lpAmount ||
              parseFloat(lpAmount) <= 0 ||
              isPending ||
              isConfirming
                ? {}
                : { scale: 1.02 }
            }
            whileTap={
              !isConnected ||
              !isArcTestnet ||
              !lpAmount ||
              parseFloat(lpAmount) <= 0 ||
              isPending ||
              isConfirming
                ? {}
                : { scale: 0.98 }
            }
          >
            {(isPending || isConfirming) && <Loader2 className="w-5 h-5 animate-spin" />}
            {!isConnected
              ? 'Connect Wallet'
              : !isArcTestnet
              ? 'Switch to Arc Testnet'
              : !lpAmount || parseFloat(lpAmount) <= 0
              ? 'Enter LP Amount'
              : isPending || isConfirming
              ? 'Processing...'
              : 'Remove Liquidity'}
          </motion.button>
        </motion.div>

        {/* Progress Modal */}
        <AnimatePresence>
          {showProgressModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
              onClick={(e) => {
                e.stopPropagation();
                // Don't close modal if transaction is in progress
                if (!isPending && !isConfirming && !removalSuccess) {
                  setShowProgressModal(false);
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
                style={{
                  boxShadow: `
                    0 0 30px rgba(251, 146, 60, 0.25),
                    0 0 60px rgba(251, 146, 60, 0.15),
                    0 10px 25px -5px rgba(0, 0, 0, 0.1),
                    0 4px 6px -2px rgba(0, 0, 0, 0.05),
                    inset 0 1px 0 rgba(255, 255, 255, 0.9)
                  `
                }}
              >
                <div className="flex items-center justify-end mb-4">
                  {!isPending && !isConfirming && !removalSuccess && (
                    <button
                      onClick={() => {
                        setShowProgressModal(false);
                        setErrorMessage(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Removing Liquidity Step */}
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isPending || isConfirming
                        ? 'bg-orange-500 text-white'
                        : (removalSuccess || (isSuccess && !isPending && !isConfirming))
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {(isPending || isConfirming) ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (removalSuccess || (isSuccess && !isPending && !isConfirming)) ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        isPending || isConfirming
                          ? 'text-orange-600'
                          : (removalSuccess || (isSuccess && !isPending && !isConfirming))
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}>
                        Removing Liquidity
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {isPending || isConfirming
                          ? 'Confirm transaction in wallet...'
                          : (removalSuccess || (isSuccess && !isPending && !isConfirming))
                          ? 'Successfully removed!'
                          : 'Pending'}
                      </p>
                    </div>
                  </div>

                  {/* Success Message */}
                  {(removalSuccess || (isSuccess && !isPending && !isConfirming)) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200"
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-green-800">
                          <p className="font-medium">Liquidity Removed Successfully!</p>
                          <p className="text-xs mt-1">
                            You have received {tokenASymbol} and {tokenBSymbol} tokens.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Error Message */}
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200 relative"
                    >
                      <button
                        onClick={() => {
                          setErrorMessage(null);
                          setShowProgressModal(false);
                        }}
                        className="absolute top-2 right-2 text-red-400 hover:text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="flex items-start gap-2 pr-6">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-red-800">
                          <p className="font-medium">Transaction Failed</p>
                          <p className="text-xs mt-1">{errorMessage}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

