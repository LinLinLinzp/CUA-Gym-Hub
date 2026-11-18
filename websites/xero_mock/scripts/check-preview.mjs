import assert from 'node:assert/strict';
const origin = 'http://localhost:5413',
  sid = `preview_${Date.now()}`,
  other = `${sid}_other`,
  get = async path => {
    const r = await fetch(origin + path);
    assert.equal(r.status, 200, path);
    return r;
  },
  post = async (body, session = sid) => getPost('/post?sid=' + session, JSON.stringify(body), 'application/json');
async function getPost(path, body, type) {
  const r = await fetch(origin + path, {
    method: 'POST',
    headers: type ? {
      'content-type': type
    } : undefined,
    body
  });
  assert.equal(r.status, 200, path);
  return r.json();
}
for (const path of ['/', '/bank-accounts/ba_090/reconcile', '/reports/balance-sheet', '/invoices/inv_0031', '/settings/tax-rates']) assert((await (await get(path + '?sid=' + sid)).text()).includes('<div id="root"></div>'));
await post({
  action: 'set',
  state: {
    invoices: [],
    marker: 'initial'
  }
});
await post({
  action: 'set_current',
  state: {
    invoices: [],
    marker: 'changed'
  }
});
const go = await (await get('/go?sid=' + sid)).json();
assert.equal(go.initial_state.marker, 'initial');
assert.equal(go.current_state.marker, 'changed');
assert(go.state_diff.marker);
const isolated = await (await get('/state?sid=' + other)).json();
assert.equal(isolated.has_custom_state, false);
const form = new FormData();
form.append('files', new Blob(['Supplier agreement and supporting details'], {
  type: 'text/plain'
}), 'supporting-details.txt');
const uploaded = await getPost('/upload?sid=' + sid, form);
assert.equal(uploaded.files[0].original_name, 'supporting-details.txt');
assert.equal(uploaded.files[0].content_type, 'text/plain');
assert.equal(await (await get(uploaded.files[0].url)).text(), 'Supplier agreement and supporting details');
console.log('PASS: production preview deep links, /go initial/current/diff, session isolation, multipart upload and attachment download');
