import { purchaseSeed } from './purchaseSeed.js'
import { referenceData } from './reference.js'
import { salesSeed } from './salesSeed.js'
import { workspaceSeed } from './workspaceSeed.js'

export function createInitialData() {
  const reference = referenceData()
  const state = { ...reference, ...salesSeed(reference), ...purchaseSeed(reference) }
  return { ...state, ...workspaceSeed(state) }
}
