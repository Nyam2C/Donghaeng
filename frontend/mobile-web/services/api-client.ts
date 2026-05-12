export const apiBaseUrl: string = process.env.EXPO_PUBLIC_API ?? 'http://localhost:3000'

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (USE_MOCKS) {
    const fixture = await import(`./__mocks__/api${path}.json`)
    await new Promise((r) => setTimeout(r, 200))
    return fixture.default as T
  }
  const res = await fetch(apiBaseUrl + path, init)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}
