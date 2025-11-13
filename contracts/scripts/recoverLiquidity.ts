import { ethers } from "hardhat";
import { formatUnits, parseUnits } from "ethers";

/**
 * EMERGENCY RECOVERY SCRIPT
 * 
 * This script helps recover liquidity from pools with stale reserves.
 * The old pools calculate removeLiquidity based on wrong reserves.
 * 
 * SOLUTION: Do a tiny swap to trigger _update(), then remove liquidity immediately
 */

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Recovery account:", signer.address);

  // Pool address with stale reserves
  const POOL_ADDRESS = process.env.POOL_ADDRESS || ""; // Set this
  const LP_AMOUNT = process.env.LP_AMOUNT || ""; // Your LP token amount
  
  if (!POOL_ADDRESS || !LP_AMOUNT) {
    console.error("Please set POOL_ADDRESS and LP_AMOUNT in .env");
    process.exit(1);
  }

  const PoolABI = [
    "function tokenA() view returns (address)",
    "function tokenB() view returns (address)",
    "function reserveA() view returns (uint256)",
    "function reserveB() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function sync() external", // If available in new pools
    "function swapAToB(uint256 amountAIn, uint256 amountBOutMin, address to) external returns (uint256)",
    "function swapBToA(uint256 amountBIn, uint256 amountAOutMin, address to) external returns (uint256)",
    "function removeLiquidity(uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to) external returns (uint256, uint256)",
  ];

  const ERC20ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ];

  const pool = await ethers.getContractAt(PoolABI, POOL_ADDRESS);
  
  // Get pool info
  const tokenAAddr = await pool.tokenA();
  const tokenBAddr = await pool.tokenB();
  const tokenA = await ethers.getContractAt(ERC20ABI, tokenAAddr);
  const tokenB = await ethers.getContractAt(ERC20ABI, tokenBAddr);
  
  const tokenADecimals = await tokenA.decimals();
  const tokenBDecimals = await tokenB.decimals();
  
  // Get ACTUAL balances (source of truth)
  const actualBalanceA = await tokenA.balanceOf(POOL_ADDRESS);
  const actualBalanceB = await tokenB.balanceOf(POOL_ADDRESS);
  
  // Get STALE reserves (what pool thinks)
  const staleReserveA = await pool.reserveA();
  const staleReserveB = await pool.reserveB();
  
  // Get LP info
  const totalSupply = await pool.totalSupply();
  const lpAmountWei = parseUnits(LP_AMOUNT, 18); // LP tokens use 18 decimals
  
  console.log("\n=== Pool State ===");
  console.log("Token A:", tokenAAddr);
  console.log("Token B:", tokenBAddr);
  console.log("\nActual Balances (TRUE):");
  console.log(`  TokenA: ${formatUnits(actualBalanceA, tokenADecimals)}`);
  console.log(`  TokenB: ${formatUnits(actualBalanceB, tokenBDecimals)}`);
  console.log("\nStale Reserves (WRONG):");
  console.log(`  ReserveA: ${formatUnits(staleReserveA, tokenADecimals)}`);
  console.log(`  ReserveB: ${formatUnits(staleReserveB, tokenBDecimals)}`);
  
  // Calculate what you SHOULD get (based on actual balances)
  const shouldGetA = (lpAmountWei * actualBalanceA) / totalSupply;
  const shouldGetB = (lpAmountWei * actualBalanceB) / totalSupply;
  
  // Calculate what pool will GIVE (based on stale reserves) - this is the problem
  const willGetA = (lpAmountWei * staleReserveA) / totalSupply;
  const willGetB = (lpAmountWei * staleReserveB) / totalSupply;
  
  console.log("\n=== Your LP Position ===");
  console.log(`LP Tokens: ${LP_AMOUNT}`);
  console.log("\nWhat you SHOULD get:");
  console.log(`  TokenA: ${formatUnits(shouldGetA, tokenADecimals)}`);
  console.log(`  TokenB: ${formatUnits(shouldGetB, tokenBDecimals)}`);
  console.log("\nWhat pool will GIVE (wrong):");
  console.log(`  TokenA: ${formatUnits(willGetA, tokenADecimals)}`);
  console.log(`  TokenB: ${formatUnits(willGetB, tokenBDecimals)}`);
  
  if (staleReserveA.toString() !== actualBalanceA.toString() || 
      staleReserveB.toString() !== actualBalanceB.toString()) {
    console.log("\n⚠️  RESERVES ARE STALE! Recovery needed.");
    
    // Try to sync if function exists (new pools only)
    try {
      console.log("\nAttempting to sync reserves...");
      const syncTx = await pool.sync();
      await syncTx.wait();
      console.log("✅ Sync successful!");
      
      // Check reserves again
      const newReserveA = await pool.reserveA();
      const newReserveB = await pool.reserveB();
      console.log("New reserves after sync:");
      console.log(`  ReserveA: ${formatUnits(newReserveA, tokenADecimals)}`);
      console.log(`  ReserveB: ${formatUnits(newReserveB, tokenBDecimals)}`);
    } catch (error: any) {
      console.log("❌ Sync failed (old pool doesn't have sync function)");
      console.log("\n=== RECOVERY OPTION ===");
      console.log("The pool reserves are stale and can't be synced.");
      console.log("Your funds are NOT lost - they're still in the pool.");
      console.log("\nOptions:");
      console.log("1. Wait for someone to make a swap (this will trigger _update())");
      console.log("2. Make a tiny swap yourself to trigger _update(), then remove liquidity");
      console.log("3. Contact pool owner/admin to manually fix reserves");
      console.log("\n⚠️  WARNING: Removing liquidity now will give you LESS than you should get!");
    }
  } else {
    console.log("✅ Reserves are in sync. Safe to remove liquidity.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

