export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ instrumentId: string }>;
}) {
  const { instrumentId } = await params;

  return (
    <main>
      <h1>{instrumentId}</h1>
      <p>
        Signal detail includes evidence, AI influence, portfolio impact, and
        professional-review context.
      </p>
      <section>
        <h2>Evidence</h2>
        <p>Rules, AI context, Strategy Backtest, and Audit Log references appear here.</p>
      </section>
    </main>
  );
}
