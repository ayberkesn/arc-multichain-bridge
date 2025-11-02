# DEX Indexer

This indexer listens to blockchain events from the DEX Factory and pools, then stores swap data in Supabase.

## Railway Setup

**IMPORTANT**: When setting up on Railway:
1. Set the **Root Directory** to `/indexer` in Railway service settings
2. The `railway.json` is already configured correctly
3. Add these environment variables in Railway:
   - `WSS_URL` - WebSocket URL (default: `wss://rpc.testnet.arc.network`)
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Your Supabase anon key

## Local Development

```bash
cd indexer
npm install
npm start
```

## Environment Variables

- `WSS_URL` - WebSocket RPC URL (default: `wss://rpc.testnet.arc.network`)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

## What the Indexer Does

The indexer will:
- Poll every 10 seconds
- Track all pools from the factory
- Listen for Swap events
- Store raw swap events in Supabase
- Update pool reserves from on-chain data (ERC20 balances)

## Troubleshooting Railway

If the indexer isn't starting on Railway:

1. **Check Root Directory**: Make sure Railway service root is set to `/indexer`
2. **Check Environment Variables**: All 3 environment variables must be set
3. **Check Logs**: Look for "Initializing indexer..." and configuration status messages
4. **Verify Start Command**: Should be `node index.js` (not `npm start`)

You should see logs like:
```
=== Indexer Configuration ===
WSS_URL: SET
SUPABASE_URL: SET (https://...)
SUPABASE_KEY: SET (eyJ...)
Supabase client: ✓ INITIALIZED
============================
Initializing indexer...
Starting indexer polling loop...
```
