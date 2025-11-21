
import { chains } from './node_modules/@circle-fin/bridge-kit/index.mjs';

console.log("Available Testnet Chains:");
Object.values(chains).forEach(chain => {
    if (chain.isTestnet) {
        console.log(`- ${chain.name} (Key: ${chain.chain})`);
    }
});
