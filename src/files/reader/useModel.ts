import { useEffect, useState } from 'react'
import type { FileShape } from '../../shapes/file/types'
import { loadAnalyzer } from '../analyzers'
import { derivedKey } from '../blob'
import { getDerived, putDerived } from '../store'

/** Modelo do leitor: do cache (calculado na importação) ou recalculado a partir do arquivo. */
export function useModel<T>(shape: FileShape, blob: Blob): { model: T | null; error: string | null } {
  const [model, setModel] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    const key = derivedKey(shape)
    void (async () => {
      try {
        let m: T | undefined = await getDerived<T>(key, 'model')
        if (m === undefined) {
          m = (await (await loadAnalyzer(shape.props.kind))(blob, shape.props.name)).model as T
          await putDerived(key, 'model', m)
        }
        if (alive) setModel(m ?? null)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      alive = false
    }
  }, [shape, blob])
  return { model, error }
}
