import { AgenticAuthGate } from '@/components/AgenticAuthGate';

export default function ClosingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AgenticAuthGate
      featureName="Daily Closing & Profit Leaks"
      description="The Profit Leak & Daily Closing Agent reconciles your private sales and collections, so it is available only to signed-in business accounts."
      highlights={[
        'Reconcile sales vs. collections and detect cash variance',
        'Audit low-margin products and profit leaks',
        'Generate official end-of-day closing reports',
      ]}
    >
      {children}
    </AgenticAuthGate>
  );
}
