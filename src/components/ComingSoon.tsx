export function ComingSoon({ title, stage }: { title: string; stage: string }) {
  return (
    <section className="panel">
      <div className="panel-title">{title}</div>
      <p className="help p-6 text-center">이 기능은 {stage}에서 연결됩니다.</p>
    </section>
  );
}
