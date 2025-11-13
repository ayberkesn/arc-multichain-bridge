import { ethers } from "hardhat";

/**
 * Script to add initial liquidity to pools
 * This makes the pools ready for trading
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Adding initial liquidity with account:", deployer.address);
  console.log("\n");

  // Contract addresses from deployment
  const FACTORY_ADDRESS = "0x511E561FaC07c0C5604f7A7E9a80219b25fDD216";
  const RAC_ADDRESS = "0x12DFE2bD72c55e7D91E0679dA7c9cC5ecB5524E6";
  const RACD_ADDRESS = "0xa1456f93C2f36f97497F82cFFBb2EA9C063465D5";
  const RACA_ADDRESS = "0xd472F90af8048F1b2Bcd8f22784E900146Cd9eCC";

  // Get contracts
  const factory = await ethers.getContractAt("PoolFactory", FACTORY_ADDRESS);
  const rac = await ethers.getContractAt("MockERC20", RAC_ADDRESS);
  const racd = await ethers.getContractAt("MockERC20", RACD_ADDRESS);
  const raca = await ethers.getContractAt("MockERC20", RACA_ADDRESS);

  // Get pool addresses
  const poolRAC_RACD = await factory.getPool(RAC_ADDRESS, RACD_ADDRESS);
  const poolRAC_RACA = await factory.getPool(RAC_ADDRESS, RACA_ADDRESS);
  const poolRACD_RACA = await factory.getPool(RACD_ADDRESS, RACA_ADDRESS);

  console.log("Pool RAC/RACD:", poolRAC_RACD);
  console.log("Pool RAC/RACA:", poolRAC_RACA);
  console.log("Pool RACD/RACA:", poolRACD_RACA);
  console.log("\n");

  // Amounts to add (using 18 decimals)
  const amountRAC = ethers.parseUnits("1000", 18); // 1000 RAC
  const amountRACD = ethers.parseUnits("1000", 18); // 1000 RACD
  const amountRACA = ethers.parseUnits("1000", 18); // 1000 RACA

  // Approve tokens for pools
  console.log("=== Approving tokens ===");
  await rac.approve(poolRAC_RACD, amountRAC);
  await racd.approve(poolRAC_RACD, amountRACD);
  console.log("Approved RAC and RACD for Pool RAC/RACD");

  await rac.approve(poolRAC_RACA, amountRAC);
  await raca.approve(poolRAC_RACA, amountRACA);
  console.log("Approved RAC and RACA for Pool RAC/RACA");

  await racd.approve(poolRACD_RACA, amountRACD);
  await raca.approve(poolRACD_RACA, amountRACA);
  console.log("Approved RACD and RACA for Pool RACD/RACA");
  console.log("\n");

  // Add liquidity to each pool
  console.log("=== Adding Liquidity ===");

  const poolRAC_RACD_Contract = await ethers.getContractAt("SimplePoolWithLP", poolRAC_RACD);
  const poolRAC_RACA_Contract = await ethers.getContractAt("SimplePoolWithLP", poolRAC_RACA);
  const poolRACD_RACA_Contract = await ethers.getContractAt("SimplePoolWithLP", poolRACD_RACA);

  // Add to Pool RAC/RACD
  console.log("Adding liquidity to Pool RAC/RACD...");
  const tx1 = await poolRAC_RACD_Contract.addLiquidity(
    amountRAC,
    amountRACD,
    0, // amountAMin (0 for initial liquidity)
    0, // amountBMin (0 for initial liquidity)
    { gasLimit: 500000 }
  );
  await tx1.wait();
  console.log("✓ Liquidity added to Pool RAC/RACD");

  // Add to Pool RAC/RACA
  console.log("Adding liquidity to Pool RAC/RACA...");
  const tx2 = await poolRAC_RACA_Contract.addLiquidity(
    amountRAC,
    amountRACA,
    0,
    0,
    { gasLimit: 500000 }
  );
  await tx2.wait();
  console.log("✓ Liquidity added to Pool RAC/RACA");

  // Add to Pool RACD/RACA
  console.log("Adding liquidity to Pool RACD/RACA...");
  const tx3 = await poolRACD_RACA_Contract.addLiquidity(
    amountRACD,
    amountRACA,
    0,
    0,
    { gasLimit: 500000 }
  );
  await tx3.wait();
  console.log("✓ Liquidity added to Pool RACD/RACA");

  console.log("\n=== DONE ===");
  console.log("All pools now have liquidity and are ready for trading!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

