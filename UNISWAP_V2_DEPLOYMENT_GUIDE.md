# Uniswap V2 Deployment Guide for Arc Testnet

## Overview

Uniswap V2 contracts are **100% open source** and can be forked and deployed on any EVM-compatible chain, including Arc Testnet. This guide will help you set up your own DEX.

## Key Uniswap V2 Contracts

Uniswap V2 consists of several core smart contracts:

### 1. **Core Contracts** (Must Deploy)
- **UniswapV2Factory.sol** - Creates and manages token pairs
- **UniswapV2Pair.sol** - Represents a liquidity pool between two tokens
- **UniswapV2Router02.sol** - Provides functions for swapping and adding/removing liquidity
- **UniswapV2ERC20.sol** - Base ERC20 contract for LP tokens

### 2. **Supporting Contracts**
- **UniswapV2Library.sol** - Helper functions for calculations
- **UniswapV2Migrator.sol** - Migration from V1 (optional)

## Getting Started

### Option 1: Fork Uniswap V2 (Recommended for Beginners)

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Uniswap/v2-core.git
   git clone https://github.com/Uniswap/v2-periphery.git
   ```

2. **Install Dependencies**
   ```bash
   cd v2-core
   npm install
   cd ../v2-periphery
   npm install
   ```

3. **Key Contracts to Deploy:**
   - From `v2-core`: `UniswapV2Factory.sol`
   - From `v2-periphery`: `UniswapV2Router02.sol`

### Option 2: Use Existing DEX Templates

Popular open-source DEX alternatives:
- **PancakeSwap V2** (forked from Uniswap V2) - https://github.com/pancakeswap/pancakeswap-core
- **SushiSwap** (also forked) - https://github.com/sushiswap/sushiswap

## Deployment Steps

### Prerequisites
- Node.js and npm installed
- Hardhat or Foundry for contract compilation/deployment
- Private key with USDC for gas on Arc Testnet
- WETH (Wrapped Ether) or WUSDC contract deployed

### Deployment Order (Critical!)

1. **Deploy WETH/WUSDC Contract** (if needed)
   - Arc uses USDC as native, so you might need a wrapped version

2. **Deploy UniswapV2Factory**
   ```solidity
   // Constructor takes a feeToSetter address (can be your deployer)
   UniswapV2Factory factory = new UniswapV2Factory(deployerAddress);
   ```

3. **Deploy UniswapV2Router02**
   ```solidity
   // Constructor needs:
   // - Factory address (from step 2)
   // - WETH/WUSDC address (from step 1)
   UniswapV2Router02 router = new UniswapV2Router02(factoryAddress, wethAddress);
   ```

### Important Arc Testnet Considerations

1. **Native Currency**: Arc uses USDC (6 decimals) as gas token
2. **WETH Replacement**: You'll likely need "WUSDC" or similar wrapped token
3. **Decimals**: Most tokens on Arc use 6 decimals (like USDC standard)
4. **Gas Costs**: Configure gas limits appropriately

## Integration with Your Frontend

Once deployed, you'll need to:

1. **Update Contract Addresses**
   - Store Factory and Router addresses in your config
   - Update Swap/Liquidity components to interact with deployed contracts

2. **Implement Core Functions:**
   - `swapExactTokensForTokens()` - For token swaps
   - `addLiquidity()` - For adding liquidity
   - `removeLiquidity()` - For removing liquidity
   - `getAmountsOut()` - For price calculations

3. **Use Viem/Wagmi** (you already have this!)
   ```typescript
   import { useWriteContract, useReadContract } from 'wagmi';
   import { parseAbi } from 'viem';
   ```

## Recommended Project Structure

```
contracts/
├── core/
│   ├── UniswapV2Factory.sol
│   ├── UniswapV2Pair.sol
│   └── UniswapV2ERC20.sol
├── periphery/
│   ├── UniswapV2Router02.sol
│   └── libraries/
│       └── UniswapV2Library.sol
├── test/
└── scripts/
    └── deploy.ts
```

## Quick Start with Hardhat

1. **Initialize Hardhat Project**
   ```bash
   npm init -y
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   npx hardhat init
   ```

2. **Configure Hardhat for Arc Testnet**
   ```javascript
   // hardhat.config.js
   networks: {
     arcTestnet: {
       url: "https://rpc.testnet.arc.network",
       chainId: 5042002,
       accounts: [process.env.PRIVATE_KEY]
     }
   }
   ```

3. **Deploy Script Example**
   ```javascript
   const factory = await ethers.deployContract("UniswapV2Factory", [deployer]);
   const router = await ethers.deployContract("UniswapV2Router02", [
     factory.target,
     wethAddress
   ]);
   ```

## Security Considerations

⚠️ **IMPORTANT**: Uniswap V2 contracts are audited, but when deploying your own:

1. **Don't modify core contracts** without understanding implications
2. **Get a security audit** if handling significant funds
3. **Test thoroughly** on testnet first
4. **Consider access controls** for factory/router (if customizing)

## Next Steps

1. Set up Hardhat/Foundry project
2. Fork and clone Uniswap V2 repositories
3. Deploy to Arc Testnet
4. Update frontend to connect to deployed contracts
5. Test swap and liquidity functions

## Resources

- **Uniswap V2 Core**: https://github.com/Uniswap/v2-core
- **Uniswap V2 Periphery**: https://github.com/Uniswap/v2-periphery
- **Uniswap V2 Docs**: https://docs.uniswap.org/contracts/v2/overview
- **Hardhat Docs**: https://hardhat.org/docs
- **Arc Network Docs**: https://docs.arc.network

## Questions to Consider

1. Do you want exact Uniswap V2 or a modified version?
2. Will you use a fee collector address?
3. Do you need migration support?
4. What tokens do you want to support initially?

