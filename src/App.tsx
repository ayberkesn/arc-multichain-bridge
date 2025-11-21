import React from 'react';
import { RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import BridgeModal from './components/BridgeModal';
import MaintenancePage from './components/MaintenancePage';
import BridgeGuide from './components/BridgeGuide';
import { ArrowLeftRight, Moon, Sun } from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

// MAINTENANCE MODE: Controlled by environment variable VITE_MAINTENANCE_MODE
// Set to "true" in .env to enable maintenance page, "false" or omit to go live
const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

function AppContent() {
  // Show maintenance page if maintenance mode is enabled
  if (MAINTENANCE_MODE) {
    return <MaintenancePage />;
  }

  const { address, isConnected } = useAccount();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-orange-50 dark:bg-gray-900 flex items-start justify-center p-3 sm:p-4 md:p-10 transition-colors duration-200 font-sans">
      <div className="w-full max-w-6xl mt-4 sm:mt-6 md:mt-10 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-orange-100 dark:border-gray-700 shadow-xl p-6 md:p-8 transition-colors duration-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="inline-flex items-center text-xs font-semibold tracking-wide uppercase text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-3 py-1 rounded-full mb-3">
                <ArrowLeftRight className="w-3 h-3 mr-2" />
                Arc Testnet Bridge
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                Unlock the Power of Arc
              </h1>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-2 max-w-2xl">
                Seamlessly bridge USDC across testnets and experience the speed of a stablecoin-native network.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm"
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-200" />
                )}
              </button>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-3 border border-gray-200 dark:border-gray-600 shadow-sm self-start md:self-auto">
                <ConnectButton
                  showBalance={true}
                  chainStatus="icon"
                  accountStatus={{
                    smallScreen: 'avatar',
                    largeScreen: 'full',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[3fr_2fr]">
            <BridgeModal asPage />
            <BridgeGuide address={address} isConnected={isConnected} />
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider locale="en-US">
            <AppContent />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}

export default App;
