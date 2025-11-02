import { motion } from 'framer-motion';
import { ArrowLeftRight, RefreshCw, Droplets, Layers, PlusCircle } from 'lucide-react';

export type TabType = 'bridge' | 'swap' | 'pools' | 'create-pool';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'bridge', label: 'Bridge', icon: ArrowLeftRight },
  { id: 'swap', label: 'Swap', icon: RefreshCw },
  { id: 'pools', label: 'Pools', icon: Layers },
  { id: 'create-pool', label: 'Create Pool', icon: PlusCircle },
];

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <div className="w-full mb-8">
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-2 border border-white/30 shadow-lg"
        style={{
          boxShadow: `
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            inset 0 -1px 0 rgba(0, 0, 0, 0.05),
            0 10px 30px rgba(0, 0, 0, 0.1),
            0 4px 8px rgba(0, 0, 0, 0.05)
          `
        }}
      >
        <div className="flex gap-1 md:gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1 md:gap-2 px-2 md:px-6 py-3 md:py-4 rounded-xl font-semibold text-xs md:text-sm transition-all duration-300 relative overflow-hidden ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Active background */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 bg-orange-500 rounded-xl"
                    layoutId="activeTab"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                
                {/* Hover background */}
                {!isActive && (
                  <div className="absolute inset-0 bg-gray-100/50 rounded-xl opacity-0 hover:opacity-100 transition-opacity" />
                )}
                
                <Icon className={`w-4 h-4 md:w-5 md:h-5 relative z-10 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                <span className="relative z-10 hidden sm:inline">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

