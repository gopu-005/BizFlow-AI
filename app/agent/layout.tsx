import { AgenticAuthGate } from '@/components/AgenticAuthGate';

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AgenticAuthGate
      featureName="the AI Agent Workspace"
      description="The multi-step agent console, Smart Entry document extraction, approvals queue, and agent audit history are available only to signed-in business accounts."
      highlights={[
        'Run guarded-autopilot agents on your own business data',
        'Smart Entry: extract bills, receipts & expenses into drafts',
        'Human-in-the-loop approvals with a full audit trail',
      ]}
    >
      {children}
    </AgenticAuthGate>
  );
}
