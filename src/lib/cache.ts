const LOCAL_CACHE_KEY = 'inkmate_editor_cache'
const EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

interface CacheEntry {
  content: string
  timestamp: number
}

export function saveLocalChapter(projectId: string, chapterId: string, content: string) {
  if (typeof window === 'undefined') return
  
  try {
    const cacheStr = localStorage.getItem(LOCAL_CACHE_KEY)
    const cache: Record<string, CacheEntry> = cacheStr ? JSON.parse(cacheStr) : {}
    
    cache[`${projectId}_${chapterId}`] = {
      content,
      timestamp: Date.now()
    }
    
    // Cleanup old entries while we're at it
    const now = Date.now()
    const cleanedCache: Record<string, CacheEntry> = {}
    for (const [key, entry] of Object.entries(cache)) {
      if (now - entry.timestamp < EXPIRY_MS * 2) { // Give a bit more buffer for cleanup
        cleanedCache[key] = entry
      }
    }
    
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cleanedCache))
  } catch (e) {
    console.error("Local cache save failed", e)
  }
}

export function getLocalChapter(projectId: string, chapterId: string): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cacheStr = localStorage.getItem(LOCAL_CACHE_KEY)
    if (!cacheStr) return null
    
    const cache: Record<string, CacheEntry> = JSON.parse(cacheStr)
    const entry = cache[`${projectId}_${chapterId}`]
    
    if (entry && Date.now() - entry.timestamp < EXPIRY_MS) {
      return entry.content
    }
    
    return null
  } catch (e) {
    return null
  }
}

export function clearLocalChapter(projectId: string, chapterId: string) {
    if (typeof window === 'undefined') return
    try {
        const cacheStr = localStorage.getItem(LOCAL_CACHE_KEY)
        if (!cacheStr) return
        const cache = JSON.parse(cacheStr)
        delete cache[`${projectId}_${chapterId}`]
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache))
    } catch (e) {}
}
