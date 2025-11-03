import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';
import TokenLogo from './TokenLogo';
import { type TokenSymbol } from '../hooks/useDEX';
import confetti from 'canvas-confetti';

interface SwapSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromToken: TokenSymbol;
  toToken: TokenSymbol;
  fromAmount: string;
  toAmount: string;
  price: number | null;
}


export default function SwapSuccessModal({
  isOpen,
  onClose,
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  price,
}: SwapSuccessModalProps) {
  // Confetti effect - trigger when modal opens
  useEffect(() => {
    if (isOpen) {
      // Trigger confetti animation like BridgeModal
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
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 sm:p-10 max-w-md w-full border border-white/30 overflow-hidden"
              style={{
                boxShadow: `
                  inset 0 1px 0 rgba(255, 255, 255, 0.9),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.05),
                  0 0 30px rgba(251, 146, 60, 0.15),
                  0 0 60px rgba(251, 146, 60, 0.1),
                  0 10px 30px rgba(0, 0, 0, 0.1),
                  0 4px 8px rgba(0, 0, 0, 0.05)
                `,
              }}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center"
                    style={{
                      boxShadow: `
                        inset 0 2px 4px rgba(255, 255, 255, 0.5),
                        inset 0 -2px 4px rgba(0, 0, 0, 0.2),
                        0 0 20px rgba(16, 185, 129, 0.4),
                        0 4px 12px rgba(16, 185, 129, 0.3)
                      `,
                    }}
                  >
                    <CheckCircle2 className="w-12 h-12 text-white" />
                  </motion.div>
                  {/* Pulse effect */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-green-400 opacity-30"
                    animate={{
                      scale: [1, 1.5, 2],
                      opacity: [0.2, 0.05, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
                  />
                </div>
              </motion.div>

              {/* Success Message */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8"
              >
                Transaction completed!
              </motion.h2>

              {/* Transaction Details */}
              <div className="space-y-6 mb-8">
                {/* You Sold */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white/60 backdrop-blur-lg rounded-2xl p-4 border border-white/40"
                  style={{
                    boxShadow: `
                      inset 2px 2px 4px rgba(255, 255, 255, 0.8),
                      inset -2px -2px 4px rgba(0, 0, 0, 0.1),
                      0 4px 8px rgba(0, 0, 0, 0.05)
                    `,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">You sold</span>
                    <div className="flex items-center gap-2">
                      <motion.div
                        initial={{ rotate: -15, scale: 0, x: -20 }}
                        animate={{ 
                          rotate: [-15, -8, -12, -8],
                          scale: 1,
                          x: 0,
                        }}
                        transition={{ 
                          delay: 0.6, 
                          type: 'spring', 
                          stiffness: 200,
                          rotate: {
                            duration: 2,
                            repeat: Infinity,
                            repeatType: 'reverse',
                          }
                        }}
                        className="relative"
                      >
                        <div className="relative">
                          <TokenLogo token={fromToken} size={36} className="drop-shadow-xl" />
                          <motion.div
                            className="absolute -inset-2 bg-orange-500/30 rounded-full blur-md"
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [0.4, 0.6, 0.4],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                          />
                        </div>
                      </motion.div>
                      <span className="text-lg sm:text-xl font-bold text-gray-900">
                        {parseFloat(fromAmount).toLocaleString('en-US', {
                          maximumFractionDigits: 6,
                        })}{' '}
                        {fromToken}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Arrow */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
                  className="flex justify-center"
                >
                  <div 
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center"
                    style={{
                      boxShadow: `
                        inset 0 2px 4px rgba(255, 255, 255, 0.5),
                        inset 0 -2px 4px rgba(0, 0, 0, 0.2),
                        0 4px 8px rgba(251, 146, 60, 0.3)
                      `,
                    }}
                  >
                    <ArrowRight className="w-6 h-6 text-white" />
                  </div>
                </motion.div>

                {/* Received */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-white/60 backdrop-blur-lg rounded-2xl p-4 border border-white/40"
                  style={{
                    boxShadow: `
                      inset 2px 2px 4px rgba(255, 255, 255, 0.8),
                      inset -2px -2px 4px rgba(0, 0, 0, 0.1),
                      0 4px 8px rgba(0, 0, 0, 0.05)
                    `,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Received</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl font-bold text-green-600">
                        {parseFloat(toAmount).toLocaleString('en-US', {
                          maximumFractionDigits: 6,
                        })}{' '}
                        {toToken}
                      </span>
                      <motion.div
                        initial={{ rotate: 15, scale: 0, x: 20 }}
                        animate={{ 
                          rotate: [15, 8, 12, 8],
                          scale: 1,
                          x: 0,
                        }}
                        transition={{ 
                          delay: 0.9, 
                          type: 'spring', 
                          stiffness: 200,
                          rotate: {
                            duration: 2,
                            repeat: Infinity,
                            repeatType: 'reverse',
                          }
                        }}
                        className="relative"
                      >
                        <div className="relative">
                          <TokenLogo token={toToken} size={36} className="drop-shadow-xl" />
                          <motion.div
                            className="absolute -inset-2 bg-green-500/30 rounded-full blur-md"
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [0.4, 0.6, 0.4],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                          />
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>

                {/* Exchange Rate */}
                {price && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="bg-white/50 backdrop-blur-md rounded-xl p-3 border border-white/30 text-center"
                    style={{
                      boxShadow: `
                        inset 2px 2px 4px rgba(255, 255, 255, 0.9),
                        inset -2px -2px 4px rgba(0, 0, 0, 0.08),
                        0 2px 4px rgba(0, 0, 0, 0.05)
                      `,
                    }}
                  >
                    <span className="text-xs text-gray-600">Exchange rate</span>
                    <p className="text-sm font-semibold text-orange-600 mt-1">
                      1 {fromToken} = {price.toFixed(6)} {toToken}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Close Button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                onClick={onClose}
                className="w-full py-3 px-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all"
                style={{
                  boxShadow: `
                    inset 0 2px 4px rgba(255, 255, 255, 0.3),
                    inset 0 -2px 4px rgba(0, 0, 0, 0.2),
                    0 4px 12px rgba(251, 146, 60, 0.4),
                    0 2px 4px rgba(0, 0, 0, 0.1)
                  `,
                }}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

