import type { LucideIcon } from 'lucide-react'

export interface LegalSection {
  title: string
  paragraphs: string[]
  items?: string[]
  links?: Array<{ label: string; href: string }>
}

interface LegalDocumentProps {
  eyebrow: string
  title: string
  description: string
  icon: LucideIcon
  sections: LegalSection[]
  updatedAt?: string
}

export function LegalDocument({
  eyebrow,
  title,
  description,
  icon: Icon,
  sections,
  updatedAt = '22 de junho de 2026',
}: LegalDocumentProps) {
  return (
    <article className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6 sm:px-6">
      <header className="relative overflow-hidden rounded-[28px] border border-[#284266] bg-gradient-to-br from-[#162849] via-[#13223c] to-[#0d1729] p-6 shadow-xl shadow-black/20">
        <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#4f8df7]/15 blur-2xl" />
        <div className="relative">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#60a5fa]/25 bg-[#4f8df7]/15 text-[#70a7ff]">
            <Icon size={24} aria-hidden="true" />
          </div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#79a9f8]">
            {eyebrow}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f5f7ff] sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#aebbd0]">{description}</p>
          <p className="mt-5 text-xs text-[#8290a6]">Atualizado em {updatedAt}</p>
        </div>
      </header>

      <div className="mt-5 overflow-hidden rounded-[24px] border border-[#1e304b] bg-[#0d1729]">
        {sections.map((section, index) => (
          <section
            key={section.title}
            className="border-b border-[#1e304b] px-5 py-6 last:border-b-0 sm:px-6"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4f8df7]/12 text-xs font-bold text-[#70a7ff]">
                {index + 1}
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[#edf3ff]">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-6 text-[#aeb8ca]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.items && (
                    <ul className="space-y-2 pl-1">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-2.5">
                          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#60a5fa]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.links?.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noreferrer' : undefined}
                      className="block break-all font-medium text-[#70a7ff] underline-offset-4 hover:underline"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </article>
  )
}
