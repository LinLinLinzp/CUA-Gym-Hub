import assert from 'node:assert/strict';
import { loadState, saveState } from '../src/utils/dataManager.js';
import { createInitialData } from '../src/data/seed.js';
const sid = `runtime_${Date.now()}`,
  origin = 'http://localhost:5413',
  storage = new Map();
globalThis.window = {
  location: {
    search: `?sid=${sid}`
  }
};
globalThis.localStorage = {
  getItem: k => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, v)
};
globalThis.sessionStorage = {
  getItem: k => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, v)
};
const nativeFetch = globalThis.fetch;
let posts = 0;
globalThis.fetch = (url, options) => {
  if (options?.method === 'POST') posts++;
  return nativeFetch(new URL(url, origin), options);
};
await nativeFetch(`${origin}/post?sid=${sid}`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    action: 'set',
    state: {
      invoices: [],
      bills: [],
      bankStatementLines: [],
      contacts: []
    }
  })
});
const s = await loadState('xero', createInitialData);
assert.equal(s.invoices.length, 0);
assert.equal(s.contacts.length, 0);
assert.equal(s.bankAccounts.length, 3);
await loadState('xero', createInitialData);
assert.equal(posts, 1);
await new Promise(r => setTimeout(r, 200));
const go = await (await nativeFetch(`${origin}/go?sid=${sid}`)).json();
assert.equal(go.current_state.invoices.length, 0);
assert.equal(go.current_state.accounts.length, 54);
console.log('PASS: injected arrays replace defaults, defaults merge, cached reload posts nothing, one baseline set, /go returns full state');
const before = posts;
await new Promise(r => setTimeout(r, 60000));
assert.equal(posts, before);
saveState('xero', {
  ...s,
  historyEvents: [{
    id: 'runtime_note',
    action: 'Note',
    details: 'Runtime check'
  }]
});
await new Promise(r => setTimeout(r, 200));
assert.equal(posts, before + 1);
const updated = await (await nativeFetch(`${origin}/go?sid=${sid}`)).json();
assert.equal(updated.current_state.historyEvents[0].id, 'runtime_note');
assert(updated.state_diff.historyEvents);
console.log('PASS: 60 seconds idle produces no posts; a user-driven save updates /go and state_diff');
