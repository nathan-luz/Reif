import type { ImageHit } from '../../src/shared/images'
import { getJson, USER_AGENT, type ImageProvider } from './types'

const UTM = 'utm_source=reif&utm_medium=referral'
const withUtm = (url: string) => `${url}${url.includes('?') ? '&' : '?'}${UTM}`
const stripHtml = (s: string) =>
  s
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^Title:\s*/i, '')
    .replace(/\s+Physical description:.*$/i, '')

// ── Unsplash ──────────────────────────────────────────────────────────────
interface UnsplashRes {
  results: {
    id: string
    width: number
    height: number
    alt_description: string | null
    description: string | null
    urls: { small: string; regular: string }
    links: { html: string; download_location: string }
    user: { name: string; links: { html: string } }
  }[]
}

export const unsplash: ImageProvider = {
  source: 'unsplash',
  isConfigured: (env) => Boolean(env.UNSPLASH_ACCESS_KEY),
  async search(q, env, perPage, signal) {
    const p = new URLSearchParams({ query: q.original, per_page: String(perPage), content_filter: 'high' })
    if (q.lang) p.set('lang', q.lang)
    const data = await getJson<UnsplashRes>('unsplash', `https://api.unsplash.com/search/photos?${p}`, {
      headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}`, 'Accept-Version': 'v1' },
      signal,
    })
    return data.results.map(
      (r): ImageHit => ({
        id: `unsplash:${r.id}`,
        source: 'unsplash',
        thumb: r.urls.small,
        url: r.urls.regular,
        width: r.width,
        height: r.height,
        title: r.alt_description ?? r.description ?? q.original,
        author: r.user.name,
        authorUrl: withUtm(r.user.links.html),
        pageUrl: withUtm(r.links.html),
        license: 'Unsplash License',
        hotlink: true,
        downloadLocation: r.links.download_location,
      }),
    )
  },
}

// ── Pixabay ───────────────────────────────────────────────────────────────
interface PixabayRes {
  hits: {
    id: number
    pageURL: string
    tags: string
    webformatURL: string
    largeImageURL: string
    imageWidth: number
    imageHeight: number
    user: string
    user_id: number
  }[]
}

export const pixabay: ImageProvider = {
  source: 'pixabay',
  isConfigured: (env) => Boolean(env.PIXABAY_API_KEY),
  async search(q, env, perPage, signal) {
    const p = new URLSearchParams({
      key: env.PIXABAY_API_KEY ?? '',
      q: q.original.slice(0, 100),
      image_type: 'all',
      ...(q.lang ? { lang: q.lang } : {}),
      safesearch: 'true',
      per_page: String(Math.max(3, perPage)),
    })
    const data = await getJson<PixabayRes>('pixabay', `https://pixabay.com/api/?${p}`, { signal })
    return data.hits.map(
      (h): ImageHit => ({
        id: `pixabay:${h.id}`,
        source: 'pixabay',
        thumb: h.webformatURL,
        url: h.largeImageURL,
        width: h.imageWidth,
        height: h.imageHeight,
        title: h.tags,
        author: h.user,
        authorUrl: `https://pixabay.com/users/${h.user}-${h.user_id}/`,
        pageUrl: h.pageURL,
        license: 'Pixabay Content License',
        hotlink: false,
      }),
    )
  },
}

// ── Pexels ────────────────────────────────────────────────────────────────
interface PexelsRes {
  photos: {
    id: number
    width: number
    height: number
    url: string
    alt: string
    photographer: string
    photographer_url: string
    src: { medium: string; large2x: string }
  }[]
}

export const pexels: ImageProvider = {
  source: 'pexels',
  isConfigured: (env) => Boolean(env.PEXELS_API_KEY),
  async search(q, env, perPage, signal) {
    const p = new URLSearchParams({ query: q.original, per_page: String(perPage) })
    if (q.lang === 'pt') p.set('locale', 'pt-BR')
    const data = await getJson<PexelsRes>('pexels', `https://api.pexels.com/v1/search?${p}`, {
      headers: { Authorization: env.PEXELS_API_KEY ?? '' },
      signal,
    })
    return data.photos.map(
      (r): ImageHit => ({
        id: `pexels:${r.id}`,
        source: 'pexels',
        thumb: r.src.medium,
        url: r.src.large2x,
        width: r.width,
        height: r.height,
        title: r.alt || q.original,
        author: r.photographer,
        authorUrl: r.photographer_url,
        pageUrl: r.url,
        license: 'Pexels License',
        hotlink: false,
      }),
    )
  },
}

// ── Wikimedia Commons ─────────────────────────────────────────────────────
interface WikimediaRes {
  query?: {
    pages: Record<
      string,
      {
        pageid: number
        title: string
        imageinfo?: {
          url: string
          thumburl?: string
          width: number
          height: number
          mime: string
          descriptionurl: string
          extmetadata?: Record<string, { value: string } | undefined>
        }[]
      }
    >
  }
}

const RASTER = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'])

export const wikimedia: ImageProvider = {
  source: 'wikimedia',
  isConfigured: () => true,
  async search(q, _env, perPage, signal) {
    const p = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: `${q.english} filetype:bitmap|drawing`,
      gsrnamespace: '6',
      gsrlimit: String(perPage),
      prop: 'imageinfo',
      iiprop: 'url|size|mime|extmetadata',
      iiurlwidth: '1280',
      iiextmetadatafilter: 'Artist|LicenseShortName|ImageDescription',
    })
    const data = await getJson<WikimediaRes>('wikimedia', `https://commons.wikimedia.org/w/api.php?${p}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal,
    })
    return Object.values(data.query?.pages ?? {}).flatMap((pg): ImageHit[] => {
      const ii = pg.imageinfo?.[0]
      if (!ii || !RASTER.has(ii.mime)) return []
      const meta = ii.extmetadata ?? {}
      const desc = meta['ImageDescription']?.value
      const artist = meta['Artist']?.value
      const license = meta['LicenseShortName']?.value
      const display = ii.thumburl ?? ii.url
      return [
        {
          id: `wikimedia:${pg.pageid}`,
          source: 'wikimedia',
          thumb: display,
          url: display,
          width: ii.width,
          height: ii.height,
          title: (desc && stripHtml(desc).slice(0, 140)) || pg.title.replace(/^File:/, ''),
          ...(artist ? { author: stripHtml(artist).slice(0, 80) } : {}),
          pageUrl: ii.descriptionurl,
          ...(license ? { license } : {}),
          hotlink: false,
        },
      ]
    })
  },
}

// ── Openverse ─────────────────────────────────────────────────────────────
interface OpenverseRes {
  results: {
    id: string
    title: string | null
    url: string
    thumbnail: string
    width: number | null
    height: number | null
    creator: string | null
    creator_url: string | null
    license: string
    license_version: string | null
    foreign_landing_url: string
  }[]
}

export const openverse: ImageProvider = {
  source: 'openverse',
  isConfigured: () => true,
  async search(q, _env, perPage, signal) {
    const p = new URLSearchParams({ q: q.english, page_size: String(perPage), mature: 'false' })
    const data = await getJson<OpenverseRes>('openverse', `https://api.openverse.org/v1/images/?${p}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal,
    })
    return data.results.map(
      (r): ImageHit => ({
        id: `openverse:${r.id}`,
        source: 'openverse',
        thumb: r.thumbnail,
        url: r.url,
        width: r.width ?? 800,
        height: r.height ?? 600,
        title: r.title ?? q.english,
        ...(r.creator ? { author: r.creator } : {}),
        ...(r.creator_url ? { authorUrl: r.creator_url } : {}),
        pageUrl: r.foreign_landing_url,
        license: `CC ${r.license.toUpperCase()}${r.license_version ? ` ${r.license_version}` : ''}`,
        hotlink: false,
      }),
    )
  },
}

export const IMAGE_PROVIDERS: readonly ImageProvider[] = [unsplash, pixabay, pexels, wikimedia, openverse]
