export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: [string, string[]][] }) {
  return (
    <div className="page-x container-x flex flex-col gap-10 pb-24 pt-10 md:pt-16 lg:flex-row lg:gap-24">
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:w-[260px] lg:self-start">
        <p className="eyebrow">Legal</p>
        <h1 className="font-display text-[48px] leading-[52px] text-teal">{title}</h1>
        <p className="text-[13px] text-stone">Last updated {updated}</p>
        <p className="rounded-[4px] bg-warning-bg px-3 py-2 text-[12px] leading-[18px] text-warning">Template text — have it reviewed by the agency&apos;s lawyer before launch.</p>
        <nav aria-label="Sections" className="hidden flex-col gap-2 pt-4 lg:flex">
          {sections.map(([h], i) => <a key={h} href={`#s${i}`} className="text-[14px] text-charcoal hover:text-teal">{h}</a>)}
        </nav>
      </aside>
      <div className="max-w-[720px]">
        {sections.map(([h, ps], i) => (
          <section key={h} id={`s${i}`} className="border-t border-line py-8">
            <h2 className="mb-4 font-display text-[26px] text-teal">{h}</h2>
            {ps.map((p) => <p key={p.slice(0, 30)} className="mb-3 text-[16px] leading-[27px] text-charcoal">{p}</p>)}
          </section>
        ))}
      </div>
    </div>
  );
}
