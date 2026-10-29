import type { BibModel } from '../analyzers/bib'
import { citation } from '../office/bib'
import type { ReaderProps } from './types'
import { useModel } from './useModel'

export default function BibReader({ shape, blob }: ReaderProps) {
  const { model, error } = useModel<BibModel>(shape, blob)
  if (error) return <p className="p-4 text-sm text-red-700">{error}</p>
  if (!model) return <p className="p-4 text-sm opacity-60">Lendo referências…</p>
  return (
    <ol className="flex list-decimal flex-col gap-3 py-4 pr-5 pl-10 text-sm" data-testid="bib-reader">
      {model.entries.map((e) => {
        const doi = e.fields['doi']
        const url = doi ? `https://doi.org/${doi.replace(/^https?:\/\/doi\.org\//, '')}` : e.fields['url']
        return (
          <li key={e.key}>
            <span>{citation(e)}</span>{' '}
            <code className="text-[11px] opacity-50">@{e.key}</code>
            {url && (
              <>
                {' '}
                <a className="text-[var(--tl-color-selected)] underline" href={url} target="_blank" rel="noopener noreferrer">
                  {doi ? 'DOI' : 'link'}
                </a>
              </>
            )}
          </li>
        )
      })}
    </ol>
  )
}
