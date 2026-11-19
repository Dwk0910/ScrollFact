interface ArticleBriefProps {
  lines: readonly string[]
}

export function ArticleBrief({ lines }: ArticleBriefProps) {
  if (lines.length === 0) return null

  return (
    <section className="rounded-2xl bg-pine-soft px-4 py-4 ring-1 ring-pine/10">
      <h2 className="text-xs font-semibold tracking-wide text-pine">읽기 전 요약</h2>
      <div className="mt-2 space-y-1.5">
        {lines.map((line, index) => (
          <p key={`${index}-${line}`} className="text-sm leading-6 text-ink">
            {line}
          </p>
        ))}
      </div>
    </section>
  )
}
