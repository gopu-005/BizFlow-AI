import { AgenticAuthGate } from '@/components/AgenticAuthGate';

export default function UdhaarLayout({ children }: { children: React.ReactNode }) {
  return (
    <AgenticAuthGate
      featureName="Udhaar & Collections"
      description="The Udhaar & Collection Agent works on your private customer credit ledgers, so it is available only to signed-in business accounts."
      highlights={[
        '0–60+ day aging buckets for every customer',
        'Payment promises and verified payment recording',
        'Pre-filled WhatsApp click-to-chat reminders',
      ]}
    >
      {children}
    </AgenticAuthGate>
  );
}
