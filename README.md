# Bridge Kit App

A React application for bridging USDC bidirectionally between Ethereum Sepolia and Arc Testnet using Circle Bridge Kit.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

## Features

- **Bidirectional Bridging**: Bridge USDC from Sepolia ↔ Arc Testnet in either direction
- **Automatic Balance Fetching**: Fetches USDC balance from the source chain
- **Chain Switching Automation**: Automatically switches chains during bridge process
- **Visual Chain Swapping**: Click the swap button to toggle bridge direction
- **Progress Tracking**: Timer and status updates during bridge process
- **Confetti Animation**: Celebration animation on successful bridge
- **Beautiful UI**: Modern UI with chain icons and smooth animations
- **Error Handling**: Comprehensive error messages and user guidance
- **Transaction Links**: Direct links to view transactions on block explorers

## Project Structure

```
src/
├── components/
│   └── BridgeModal.tsx      # Main bridge modal component
├── hooks/
│   └── useBridge.ts         # Core bridging logic hook
├── config/
│   └── wagmi.ts            # Wagmi configuration
├── App.tsx                 # Main app component
└── main.tsx                # App entry point
```

## Usage

The `BridgeModal` component is already integrated in `App.tsx`. Simply click the "Bridge USDC" button to start bridging.

### Custom Integration

```tsx
import BridgeModal from './components/BridgeModal';
import { useState } from 'react';

function MyApp() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>Bridge USDC</button>
      <BridgeModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
```

### Using the Bridge Hook Directly

You can also use the `useBridge` hook directly for more control:

```tsx
import { useBridge } from './hooks/useBridge';

function MyCustomComponent() {
  const { state, tokenBalance, bridge, fetchTokenBalance } = useBridge();
  
  const handleBridge = async () => {
    // Bridge from Sepolia to Arc
    await bridge('USDC', '10', 'sepolia-to-arc');
    
    // Or bridge from Arc to Sepolia
    // await bridge('USDC', '10', 'arc-to-sepolia');
  };
  
  return (
    <div>
      <p>Balance: {tokenBalance} USDC</p>
      <button onClick={handleBridge}>Bridge</button>
      {state.step === 'success' && <p>Bridge successful!</p>}
    </div>
  );
}
```

## Requirements

- MetaMask or compatible wallet
- USDC on Ethereum Sepolia or Arc Testnet (depending on bridge direction)
- Node.js 18+

### Manual Arc Testnet Setup

**Important**: Arc Testnet must be manually added to your wallet before using the bridge.

Add Arc Testnet to MetaMask with these details:
- **Network Name**: Arc Testnet
- **RPC URL**: `https://rpc.testnet.arc.network`
- **Chain ID**: `5042002`
- **Currency Symbol**: `USDC`
- **Block Explorer**: `https://testnet.arcscan.app`
- **Decimals**: `6` (USDC uses 6 decimals)

## How It Works

1. **Select Direction**: Choose to bridge from Sepolia → Arc or Arc → Sepolia using the swap button
2. **Enter Amount**: Input the amount of USDC you want to bridge
3. **Approve Transactions**: Approve the token approval and transfer transactions
4. **Automatic Chain Switch**: The bridge automatically switches to the destination chain
5. **Confirm Receive**: Approve the receive message transaction on the destination chain
6. **Celebrate**: Confetti animation and success message with transaction links!

## Get USDC

Get testnet USDC from the [Circle Faucet](https://faucet.circle.com/) for Sepolia, or use the Arc Testnet faucet for Arc USDC.

## Supported Chains

- **Ethereum Sepolia** (Chain ID: 11155111)
- **Arc Testnet** (Chain ID: 5042002)

## Token Addresses

- **Sepolia USDC**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **Arc Testnet USDC**: `0x3600000000000000000000000000000000000000`

## License

MIT

