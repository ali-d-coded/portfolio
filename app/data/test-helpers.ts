import type { ContentSnapshot } from './content.ts'
import { clearSqliteStore } from './sqlite-store.ts'
import { store } from './store.ts'

/**
 * Test-only. Empties the app-wide store and, given a snapshot, loads it.
 * Router tests use this to seed what the controllers read.
 */
export async function resetStore(snapshot?: ContentSnapshot): Promise<void> {
  await clearSqliteStore(store)
  if (snapshot) await store.importAll(snapshot)
}
