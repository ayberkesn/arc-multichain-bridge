// DEX Contract Addresses on Arc Testnet
// Deployed: [Date of deployment]
// Network: Arc Testnet (Chain ID: 5042002)

export const DEX_CONFIG = {
  // Factory Contract
  FACTORY_ADDRESS: "0x10E949cf49a713363aC6158A4f83A897dA004EC7",
  
  // Token Addresses (Optional - only if you want to use predefined tokens)
  // Users can use any ERC20 tokens, not just these
  TOKENS: {
    RAC: "0x12DFE2bD72c55e7D91E0679dA7c9cC5ecB5524E6",
    RACD: "0xa1456f93C2f36f97497F82cFFBb2EA9C063465D5",
    RACA: "0xd472F90af8048F1b2Bcd8f22784E900146Cd9eCC",
  },
  
  // Note: Pools are now fetched dynamically from the factory contract
  // No need for hardcoded pool addresses
  
  // Network Info
  CHAIN_ID: 5042002,
  EXPLORER_URL: "https://testnet.arcscan.app",
};

