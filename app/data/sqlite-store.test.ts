import { createSqliteContentStore } from './sqlite-store.ts'
import { describeContentStore } from './store-contract.ts'

describeContentStore('sqlite', () => createSqliteContentStore({ filename: ':memory:' }))
