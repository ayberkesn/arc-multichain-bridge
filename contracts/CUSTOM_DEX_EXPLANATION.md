# Custom DEX Contracts - Simplified Explanation

## Yes! You Can Build Your Own - It's Actually Simpler!

Creating custom swap and liquidity contracts is **totally doable** and often **easier to understand** than forking Uniswap V2!

## The Math Behind It (Super Simple)

### Constant Product Formula
```
x * y = k
```
- x = amount of Token A in pool
- y = amount of Token B in pool
- k = constant (must stay same)

### Example:
1. Pool starts with: 100 TokenA + 200 TokenB
   - k = 100 * 200 = 20,000

2. Someone wants to swap 10 TokenA:
   - New TokenA: 110
   - New TokenB needed: 20,000 / 110 = 181.81
   - They get: 200 - 181.81 = **18.19 TokenB**

3. Pool now has: 110 TokenA + 181.81 TokenB
   - Check: 110 * 181.81 = 19,999.1 ≈ 20,000 ✅

That's it! The whole swap formula!

## What I've Created For You

### 1. **SimpleSwap.sol** - Basic Swap Contract
- ✅ Swap Token A ↔ Token B
- ✅ Constant product formula
- ✅ Trading fee (0.3% default)
- ✅ ~150 lines of code

### 2. **SimplePoolWithLP.sol** - Full Liquidity Pool
- ✅ Add liquidity (get LP tokens)
- ✅ Remove liquidity (burn LP tokens)
- ✅ Swap tokens
- ✅ LP token tracking
- ✅ ~250 lines of code

### 3. **PoolFactory.sol** - Create Multiple Pools
- ✅ Create pool for any token pair
- ✅ Track all pools
- ✅ Find pools by token pair

## Why Custom is Better

### Advantages:
✅ **Simpler** - Only ~400 lines total vs 1000+ in Uniswap V2
✅ **Easier to understand** - You wrote it!
✅ **Easier to modify** - Change fees, add features easily
✅ **No complex dependencies** - Just OpenZeppelin
✅ **Perfect for Arc Testnet** - Optimized for your needs

### Trade-offs:
⚠️ **Less tested** - Uniswap V2 is battle-tested
⚠️ **Less optimized** - Uniswap has gas optimizations
⚠️ **Fewer features** - No flash loans, TWAP, etc.

**For your use case (Arc Testnet DEX), custom is perfect!**

## Complexity Breakdown

| Task | Complexity | Time Estimate |
|------|------------|---------------|
| Understanding AMM math | ⭐ Easy | 30 min |
| Writing SimpleSwap | ⭐⭐ Medium | 2-3 hours |
| Writing SimplePoolWithLP | ⭐⭐⭐ Medium-Hard | 4-6 hours |
| Testing on testnet | ⭐⭐ Medium | 2-3 hours |
| **Total** | **⭐⭐ Medium** | **1-2 days** |

## How It Works

### Swap Flow:
```
User → Contract.swap(tokenA, 10)
  ↓
Contract calculates: (reserveB * 9.97) / (reserveA + 9.97)
  ↓
Transfer 10 tokenA to pool
Transfer X tokenB to user
  ↓
Update reserves
```

### Add Liquidity Flow:
```
User → Contract.addLiquidity(100 tokenA, 200 tokenB)
  ↓
Contract calculates LP tokens: sqrt(100 * 200) = 141.42
  ↓
Transfer tokens to pool
Mint LP tokens to user
  ↓
Update reserves
```

### Remove Liquidity Flow:
```
User → Contract.removeLiquidity(141.42 LP tokens)
  ↓
Calculate amounts: (LP / totalLP) * reserves
  ↓
Burn LP tokens
Transfer tokens back to user
  ↓
Update reserves
```

## Deployment Order

1. **Deploy Token Contracts** (if you don't have test tokens)
   - MockERC20 for Token A
   - MockERC20 for Token B

2. **Option A: Deploy SimpleSwap** (one pool only)
   ```solidity
   SimpleSwap swap = new SimpleSwap(tokenA, tokenB);
   ```

3. **Option B: Deploy PoolFactory + Pools** (multiple pairs)
   ```solidity
   PoolFactory factory = new PoolFactory();
   factory.createPool(tokenA, tokenB);
   ```

## Integration with Your Frontend

Once deployed, your Swap/Liquidity components can call:

```typescript
// Swap
await swapContract.write.swap([tokenAAddress, amountIn]);

// Add Liquidity  
await poolContract.write.addLiquidity([
  amountA, amountB, amountAMin, amountBMin
]);

// Remove Liquidity
await poolContract.write.removeLiquidity([
  lpAmount, amountAMin, amountBMin, userAddress
]);
```

## Next Steps

1. ✅ I've created the contracts above
2. 📋 You can deploy these directly
3. 🔧 Or modify them to your needs
4. 🚀 Then integrate with your frontend

Want me to:
- Create deployment scripts?
- Create frontend hooks to interact with these contracts?
- Add more features (like price oracles)?
- Create test files?

