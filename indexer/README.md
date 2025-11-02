# DEX Indexer

This indexer listens to blockchain events from the DEX Factory and pools, then stores swap data in Supabase.

## Setup for Railway

1. Create a new Railway project
2. Connect this directory as a service
3. Add environment variables:
   - `WSS_URL` - WebSocket URL (default: `wss://rpc.testnet.arc.network`)
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Your Supabase anon key

## Local Development

```bash
npm install
npm start
```

## Environment Variables

- `WSS_URL` - WebSocket RPC URL (default: `wss://rpc.testnet.arc.network`)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

The indexer will:
- Poll every 30 seconds
- Track all pools from the factory
- Listen for Swap events
- Calculate volume and fees
- Store in Supabase

