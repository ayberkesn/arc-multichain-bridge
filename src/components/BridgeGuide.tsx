import { ExternalLink, Info, ShieldCheck, Zap } from 'lucide-react';

interface BridgeGuideProps {
  address?: string;
  isConnected: boolean;
}

const steps = [
  {
    title: '1. Pick direction',
    detail: 'Choose Source Chain → Arc to mint USDC on Arc, or Arc → Destination Chain to return funds.',
  },
  {
    title: '2. Prepare gas & USDC',
    detail: 'You need native tokens for gas on the source chain and USDC on the Bridge Kit contracts. Arc uses USDC as gas, so fund both balances before bridging.',
  },
  {
    title: '3. Approve + transfer',
    detail: 'Bridge Kit will guide you through approval, burn/mint, and receive message confirmations. Keep the wallet open until all prompts complete.',
  },
  {
    title: '4. Verify on-chain',
    detail: 'Use transaction links from the success screen or Arc Explorer to confirm arrival.',
  },
  {
    title: '5. Have fun with the bridge!',
    detail: (
      <span>
        If you have any questions feel free to ask!
        <br />
        <span className="inline-block mt-1 font-mono text-xs text-orange-200">
          X / Twitter: @1ayberkk • Discord: .ayberkk
        </span>
      </span>
    ),
  },
];

const resources = [
  {
    label: 'Arc concepts: Economic OS overview',
    href: 'https://docs.arc.network/arc/concepts/welcome-to-arc',
  },
  {
    label: 'Circle USDC Faucet',
    href: 'https://faucet.circle.com/',
  },
  {
    label: 'Arc Explorer',
    href: 'https://testnet.arcscan.app',
  },
];

export default function BridgeGuide({ address, isConnected }: BridgeGuideProps) {
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  return (
    <div className="bg-orange-950 text-orange-50 rounded-3xl p-5 md:p-6 flex flex-col gap-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
          <ShieldCheck className="w-4 h-4 text-lime-300" />
          Testnet Checklist
        </div>
        <p className="text-sm text-orange-100">
          Arc is purpose-built for real-world economic rails with predictable USDC-based fees and sub-second settlement, so each bridge run mimics production flows.
        </p>
        {isConnected ? (
          <p className="text-xs text-orange-200">Connected wallet: {shortAddress}</p>
        ) : (
          <p className="text-xs text-orange-200">Connect your wallet to start bridging.</p>
        )}
      </header>

      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.title}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-3"
          >
            <Zap className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">{step.title}</p>
              <p className="text-sm text-orange-100">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Info className="w-4 h-4 text-sky-200" />
          Resources
        </div>
        <ul className="space-y-2 text-sm">
          {resources.map((resource) => (
            <li key={resource.href}>
              <a
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-orange-100 hover:text-white"
              >
                <ExternalLink className="w-4 h-4" />
                {resource.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


