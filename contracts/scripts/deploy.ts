import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

// Get deployment type from environment variable or default to "all"
// Usage: DEPLOY_TYPE=tokens npm run deploy:arc or DEPLOY_TYPE=factory npm run deploy:arc
const deploymentType = process.env.DEPLOY_TYPE || "all"; // "tokens", "factory", or "all"

async function main() {
  const signers = await ethers.getSigners();
  
  if (signers.length === 0) {
    console.error("ERROR: No signers found!");
    console.error("Make sure you have:");
    console.error("1. Created a .env file in the contracts folder");
    console.error("2. Added your PRIVATE_KEY=0x... to the .env file");
    console.error("3. The private key is valid and starts with 0x");
    process.exit(1);
  }
  
  const deployer = signers[0];
  
  console.log("Deploying contracts with account:", deployer.address);
  
  try {
    const balance = await ethers.provider.getBalance(deployer.address);
    // Arc uses USDC (6 decimals), so format accordingly
    const balanceUSDC = Number(balance) / 1000000;
    console.log("Account balance:", balanceUSDC.toFixed(6), "USDC");
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "Chain ID:", network.chainId);
    
    // Check for pending transactions (might cause "underpriced" error)
    const pendingCount = await ethers.provider.getTransactionCount(deployer.address, "pending");
    const latestCount = await ethers.provider.getTransactionCount(deployer.address, "latest");
    
    if (pendingCount > latestCount) {
      console.warn(`⚠️  Warning: ${pendingCount - latestCount} pending transaction(s) detected.`);
      console.warn("   This might cause 'replacement transaction underpriced' errors.");
      console.warn("   You may need to wait for pending transactions to confirm or increase gas price.");
    }
  } catch (error) {
    console.warn("Could not fetch balance or network info:", error);
  }
  console.log("\n");

  const deploymentInfo: any = {
    network: "arc-testnet",
    chainId: 5042002,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    tokens: {},
  };

  // Deploy tokens if requested
  if (deploymentType === "tokens" || deploymentType === "all") {
    console.log("=== Deploying Tokens (SRAC, RACS, SACS) ===");
    
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    
    // Deploy SRAC token
    console.log("\nDeploying SRAC token...");
    const srac = await MockERC20.deploy(
      "Simple RAC Token",
      "SRAC",
      18
    );
    await srac.waitForDeployment();
    const sracAddress = await srac.getAddress();
    console.log("✓ SRAC deployed to:", sracAddress);
    deploymentInfo.tokens.SRAC = {
      name: "Simple RAC Token",
      symbol: "SRAC",
      address: sracAddress,
      decimals: 18,
      totalSupply: "10000000",
    };

    // Deploy RACS token
    console.log("\nDeploying RACS token...");
    const racs = await MockERC20.deploy(
      "RAC Swap Token",
      "RACS",
      18
    );
    await racs.waitForDeployment();
    const racsAddress = await racs.getAddress();
    console.log("✓ RACS deployed to:", racsAddress);
    deploymentInfo.tokens.RACS = {
      name: "RAC Swap Token",
      symbol: "RACS",
      address: racsAddress,
      decimals: 18,
      totalSupply: "10000000",
    };

    // Deploy SACS token
    console.log("\nDeploying SACS token...");
    const sacs = await MockERC20.deploy(
      "Swap ACR Token",
      "SACS",
      18
    );
    await sacs.waitForDeployment();
    const sacsAddress = await sacs.getAddress();
    console.log("✓ SACS deployed to:", sacsAddress);
    deploymentInfo.tokens.SACS = {
      name: "Swap ACR Token",
      symbol: "SACS",
      address: sacsAddress,
      decimals: 18,
      totalSupply: "10000000",
    };

    // Verify supply
    const sracSupply = await srac.totalSupply();
    const racsSupply = await racs.totalSupply();
    const sacsSupply = await sacs.totalSupply();
    
    console.log("\n=== Token Supply Verification ===");
    console.log(`SRAC Supply: ${ethers.formatEther(sracSupply)} (10,000,000)`);
    console.log(`RACS Supply: ${ethers.formatEther(racsSupply)} (10,000,000)`);
    console.log(`SACS Supply: ${ethers.formatEther(sacsSupply)} (10,000,000)`);
    console.log("\n");
  }

  // Deploy PoolFactory if requested
  if (deploymentType === "factory" || deploymentType === "all") {
    console.log("=== Deploying PoolFactory ===");
    
    const PoolFactory = await ethers.getContractFactory("PoolFactory");
    const factory = await PoolFactory.deploy();
    console.log("⏳ Waiting for deployment confirmation...");
    
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    
    const factoryTx = factory.deploymentTransaction();
    if (factoryTx) {
      const receipt = await factoryTx.wait();
      if (receipt) {
        console.log("✓ PoolFactory deployed to:", factoryAddress);
        console.log("   Block:", receipt.blockNumber);
        console.log("   Transaction:", factoryTx.hash);
        console.log("   Explorer: https://testnet.arcscan.app/address/" + factoryAddress);
      } else {
        console.log("✓ PoolFactory deployed to:", factoryAddress);
      }
    } else {
      console.log("✓ PoolFactory deployed to:", factoryAddress);
    }
    
    deploymentInfo.factory = {
      address: factoryAddress,
    };
    console.log("\n");
  }

  // Save deployment info
  const outputPath = path.join(__dirname, "..", "DEPLOYMENT_ADDRESSES.txt");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Deployment info saved to:", outputPath);

  // Summary
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  if (deploymentInfo.tokens.SRAC) {
    console.log("\nTokens:");
    console.log("  SRAC:", deploymentInfo.tokens.SRAC.address);
    console.log("  RACS:", deploymentInfo.tokens.RACS.address);
    console.log("  SACS:", deploymentInfo.tokens.SACS.address);
  }
  if (deploymentInfo.factory) {
    console.log("\nFactory:", deploymentInfo.factory.address);
  }
  
  console.log("\n=== NEXT STEPS ===");
  if (deploymentInfo.tokens.SRAC) {
    console.log("1. Update DEX_CONFIG.TOKENS in src/config/dex.ts with token addresses above");
  }
  if (deploymentInfo.factory) {
    console.log(`${deploymentInfo.tokens.SRAC ? "2" : "1"}. Update FACTORY_ADDRESS in src/config/dex.ts`);
    console.log(`${deploymentInfo.tokens.SRAC ? "3" : "2"}. Create pools via the UI using the 'Create Pool' tab`);
    console.log(`${deploymentInfo.tokens.SRAC ? "4" : "3"}. Add liquidity through the 'Liquidity' tab`);
    console.log(`${deploymentInfo.tokens.SRAC ? "5" : "4"}. Start trading!`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
