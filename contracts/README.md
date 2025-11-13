# Custom DEX Contracts - Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd contracts
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your PRIVATE_KEY
```

### 3. Compile Contracts
```bash
npm run compile
```

### 4. Deploy to Arc Testnet
```bash
npm run deploy:arc
```

### 5. Add Initial Liquidity (Optional)
After deployment, update addresses in `scripts/addInitialLiquidity.ts` and run:
```bash
npm run add-liquidity
```

## Contract Structure

- **MockERC20.sol** - Test tokens (TokenA, TokenB, TokenC) with 18 decimals
- **SimplePoolWithLP.sol** - Liquidity pool with LP tokens
- **PoolFactory.sol** - Factory to create multiple pools

## Deployment Order

1. Deploy 3 MockERC20 tokens (TokenA, TokenB, TokenC)
2. Deploy PoolFactory
3. Factory creates pools for: A/B, A/C, B/C

## Important Notes

- Arc uses **USDC (6 decimals)** for gas fees
- Our tokens use **18 decimals** for consistency
- Base fee is ~$0.01 per transaction
- You need USDC on Arc Testnet to pay for gas

## Getting USDC on Arc Testnet

Visit the Arc faucet to get test USDC for gas fees.

