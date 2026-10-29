import { useEffect, useState } from 'react'
import { getDerived, objectUrlFor } from './store'

/** Object URL da thumbnail derivada (carregada uma vez por sessão). */
export function useThumbUrl(key: string, enabled: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!enabled || !key) return
    let alive = true
    void objectUrlFor(`thumb:${key}`, () => getDerived<Blob>(key, 'thumb')).then((u) => alive && setUrl(u))
    return () => {
      alive = false
    }
  }, [key, enabled])
  return enabled ? url : null
}

export function useDerivedValue<T>(key: string, name: string, enabled = true): T | undefined {
  const [value, setValue] = useState<T>()
  useEffect(() => {
    if (!enabled || !key) return
    let alive = true
    void getDerived<T>(key, name).then((v) => alive && setValue(v))
    return () => {
      alive = false
    }
  }, [key, name, enabled])
  return value
}
