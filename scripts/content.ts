import { readFile, writeFile } from 'node:fs/promises'

import type { ContentSnapshot } from '../app/data/content.ts'
import { StoreNotEmptyError, store } from '../app/data/store.ts'

let [command, file] = process.argv.slice(2)

if (!file || (command !== 'export' && command !== 'import')) {
  console.error(
    'Usage: npm run content:export -- <file.json>\n       npm run content:import -- <file.json>',
  )
  process.exit(1)
}

let exitCode = 0
try {
  if (command === 'export') {
    let snapshot = await store.exportAll()
    await writeFile(file, JSON.stringify(snapshot, null, 2) + '\n')
    console.log(`Exported ${snapshot.projects.length} projects to ${file}`)
  } else {
    let snapshot = JSON.parse(await readFile(file, 'utf8')) as ContentSnapshot
    await store.importAll(snapshot)
    console.log(`Imported ${snapshot.projects.length} projects from ${file}`)
  }
} catch (error) {
  if (error instanceof StoreNotEmptyError) {
    console.error('The database already has content. Import only works into an empty database.')
  } else {
    console.error(error instanceof Error ? error.message : error)
  }
  exitCode = 1
} finally {
  await store.close()
}
process.exit(exitCode)
