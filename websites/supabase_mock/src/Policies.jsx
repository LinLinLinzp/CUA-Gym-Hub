import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { list, matches, record, replace, useWorkspace, without } from './workspace.jsx'
import { Badge, Button, DataGrid, Dialog, Empty, Field, Filter, Icon, PageHead, Pager, Search, Toggle } from './ui.jsx'
import { setRls } from './Tables.jsx'

const commands = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL']
const suggestedRoles = ['authenticated', 'anon', 'public', 'service_role']
const usingCommands = ['SELECT', 'UPDATE', 'DELETE', 'ALL']
const checkCommands = ['INSERT', 'UPDATE', 'ALL']
const keyOf = (type, id) => `${type}:${id}`
const targetName = (type, item) => type === 'table' ? `${item.schema || 'public'}.${item.name || item.id}` : item.name || item.id
const sqlIdentifier = value => `"${String(value).replaceAll('"', '""')}"`

function targetsOf(state) {
  return [
    ...list(state.tables).map(item => ({ key: keyOf('table', item.id), type: 'table', item })),
    ...list(state.buckets).map(item => ({ key: keyOf('bucket', item.id), type: 'bucket', item })),
  ]
}

export function Policies() {
  const { state, commit, reportError } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [command, setCommand] = useState('')
  const [page, setPage] = useState(0)
  const [editor, setEditor] = useState(null)
  const targetFilter = params.get('target') || ''
  const targets = targetsOf(state)
  const policies = list(state.policies)
  const targetGroups = new Map()
  for (const policy of policies) {
    const key = keyOf(policy.targetType, policy.targetId)
    if (!targetGroups.has(key)) targetGroups.set(key, [])
    targetGroups.get(key).push(policy)
  }
  const groups = targets.filter(({ key, type, item }) => {
    if (targetFilter && targetFilter !== type && targetFilter !== key) return false
    return matches(query, targetName(type, item), item.id)
  }).map(target => ({
    ...target,
    rules: list(targetGroups.get(target.key)).filter(rule => !command || rule.command === command),
  })).filter(group => !command || group.rules.length)
  const pageSize = 8
  const activePage = Math.min(page, Math.max(0, Math.ceil(groups.length / pageSize) - 1))
  const close = () => setEditor(null)
  const add = group => setEditor({ kind: 'edit', target: group?.key || (targets.some(target => target.key === targetFilter) ? targetFilter : '') })
  async function remove(rule) {
    await commit(current => record({ policies: without(current.policies, rule.id) }, 'policy.deleted', rule.id,
      { policyId: rule.id, targetType: rule.targetType, targetId: rule.targetId }, { name: rule.name, command: rule.command }), 'Policy deleted.')
  }
  return <>
    <PageHead eyebrow="Access control" title="Policies" description="Review row-level security and define access rules for tables and storage buckets.">
      <Button variant="primary" icon="plus" disabled={!targets.length} onClick={() => add()}>New policy</Button>
    </PageHead>
    <section className="panel" aria-label="Policy targets">
      <div className="toolbar">
        <Search title="Search targets" value={query} onChange={value => { setQuery(value); setPage(0) }} />
        <Filter title="Target type" value={targetFilter} options={[
          ['', 'All targets'], ['table', 'Tables'], ['bucket', 'Buckets'],
          ...(targetFilter && !['table', 'bucket'].includes(targetFilter)
            ? [[targetFilter, targets.find(item => item.key === targetFilter)?.item.name || 'Selected target']] : []),
        ]} onChange={value => {
          const next = new URLSearchParams(params)
          if (value) next.set('target', value)
          else next.delete('target')
          setParams(next, { replace: true })
          setPage(0)
        }} />
        <Filter title="Command" value={command} options={[[ '', 'All commands'], ...commands]} onChange={value => { setCommand(value); setPage(0) }} />
        <span className="result-count">{groups.length} {groups.length === 1 ? 'target' : 'targets'} · {groups.reduce((sum, group) => sum + group.rules.length, 0)} policies</span>
      </div>
      {!groups.length && <Empty title={targets.length ? 'No matching targets' : 'No policy targets'}>{targets.length ? 'Try adjusting your search or filters.' : 'Create a table or bucket to configure its access rules.'}</Empty>}
      <div className="policy-groups">{groups.slice(activePage * pageSize, (activePage + 1) * pageSize).map(group => {
        const { item, type, key, rules } = group
        const name = targetName(type, item)
        return <section className="policy-group" key={key} aria-label={name}>
          <div className="policy-heading"><div className="policy-title">
            <span className="area-icon"><Icon name={type === 'table' ? 'tables' : 'storage'} /></span>
            <div><h2 className="mono">{name}</h2><p>{type === 'table' ? 'Table' : 'Bucket'} · {rules.length} {rules.length === 1 ? 'policy' : 'policies'}</p></div>
          </div><div className="actions">
            {type === 'table' && <Toggle title="Row-level security (RLS)" checked={item.rlsEnabled} onChange={value => setRls(commit, item.id, value).catch(reportError)} />}
            <Button icon="plus" onClick={() => add(group)}>Add policy</Button>
          </div></div>
          {rules.length ? <DataGrid title={`Policies for ${name}`}><thead><tr><th>Policy name</th><th>Command</th><th>Applies to</th><th>Actions</th></tr></thead>
            <tbody>{rules.map(rule => <tr key={rule.id}><td><strong>{rule.name || rule.id}</strong></td>
              <td><Badge tone="info">{rule.command || '—'}</Badge></td><td className="mono">{list(rule.roles).join(', ') || '—'}</td>
              <td><div className="row-actions">
                <Button variant="quiet" onClick={() => setEditor({ kind: 'edit', rule, target: key })}>Edit policy</Button>
                <Button variant="quiet destructive" onClick={() => setEditor({ kind: 'delete', rule })}>Delete policy</Button>
              </div></td></tr>)}</tbody></DataGrid> : <p className="policy-empty">No policies configured.</p>}
        </section>
      })}</div>
      <Pager page={activePage} pageSize={pageSize} total={groups.length} onChange={setPage} />
    </section>
    {editor?.kind === 'edit' && <PolicyEditor rule={editor.rule} initialTarget={editor.target} close={close} />}
    {editor?.kind === 'delete' && <Dialog title="Delete policy" confirm danger onClose={close} onSubmit={() => remove(editor.rule)} submitLabel="Delete policy">
      <p>Delete <strong>{editor.rule.name || editor.rule.id}</strong>?</p>
      <p className="mono">{editor.rule.command} · {list(editor.rule.roles).join(', ') || '—'}</p>
    </Dialog>}
  </>
}

function PolicyEditor({ rule, initialTarget, close }) {
  const { state, commit } = useWorkspace()
  const targets = targetsOf(state)
  const [targetKey, setTarget] = useState(initialTarget || targets[0]?.key || '')
  const target = targets.find(item => item.key === targetKey)
  const [name, setName] = useState(rule?.name || '')
  const [command, setCommand] = useState(commands.includes(rule?.command) ? rule.command : 'SELECT')
  const [rolesText, setRolesText] = useState(rule ? list(rule.roles).join(', ') : 'authenticated')
  const [using, setUsing] = useState(rule?.usingExpression || '')
  const [check, setCheck] = useState(rule?.checkExpression || '')
  const usesUsing = usingCommands.includes(command)
  const usesCheck = checkCommands.includes(command)
  const roles = [...new Set(rolesText.split(/[\s,]+/).filter(Boolean))]
  const usingExpression = usesUsing ? using.trim() || null : null
  const checkExpression = usesCheck ? check.trim() || null : null
  const sqlTarget = target?.type === 'table'
    ? `${sqlIdentifier(target.item.schema || 'public')}.${sqlIdentifier(target.item.name || target.item.id)}`
    : '"storage"."objects"'
  const scoped = expression => {
    if (target?.type !== 'bucket') return expression
    const bucket = String(target.item.name || target.item.id).replaceAll("'", "''")
    return `bucket_id = '${bucket}' AND (${expression})`
  }
  const preview = [
    `CREATE POLICY ${sqlIdentifier(name.trim() || 'policy_name')}`,
    `ON ${sqlTarget}`,
    `FOR ${command}`,
    `TO ${roles.length ? roles.map(role => role.toLowerCase() === 'public' ? 'PUBLIC' : sqlIdentifier(role)).join(', ') : 'PUBLIC'}`,
    usesUsing && `USING (${scoped(usingExpression || 'expression')})`,
    usesCheck && (checkExpression || command === 'INSERT') && `WITH CHECK (${scoped(checkExpression || 'expression')})`,
  ].filter(Boolean).join('\n') + ';'

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Enter a policy name.')
    if (!target) throw new Error('Choose a table or bucket.')
    if (!roles.length || roles.some(role => !/^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(role))) throw new Error('Enter one or more valid role names separated by commas.')
    if (usesUsing && !usingExpression) throw new Error(`${command} requires a USING expression.`)
    if (command === 'INSERT' && !checkExpression) throw new Error('INSERT requires a WITH CHECK expression.')
    const id = rule?.id || crypto.randomUUID()
    const related = { policyId: id, targetType: target.type, targetId: target.item.id }
    await commit((current, meta) => {
      const policies = list(current.policies)
      if (policies.some(policy => policy.id !== id && policy.targetType === target.type && policy.targetId === target.item.id && policy.name?.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error('A policy with this name already exists for the selected target.')
      }
      const fields = { name: trimmed, targetType: target.type, targetId: target.item.id, command, roles, usingExpression, checkExpression }
      const next = rule ? { ...policies.find(item => item.id === id), ...fields, actorId: meta.actorId, updatedAt: meta.updatedAt } : { id, ...fields, ...meta }
      return record({ policies: rule ? replace(policies, id, next) : [...policies, next] },
        rule ? 'policy.updated' : 'policy.created', id, related, { name: trimmed, command })
    }, rule ? 'Policy updated.' : 'Policy created.')
  }
  return <Dialog title={rule ? 'Edit policy' : 'New policy'} onClose={close} onSubmit={save} submitLabel={rule ? 'Save changes' : 'Create policy'}>
    <Field title="Target"><select value={targetKey} required onChange={event => setTarget(event.target.value)}>
      <option value="" disabled>Choose a target</option>
      {[['table', 'Tables'], ['bucket', 'Buckets']].map(([type, title]) => <optgroup key={type} label={title}>
        {targets.filter(item => item.type === type).map(({ key, item }) => <option key={key} value={key}>{targetName(type, item)}</option>)}
      </optgroup>)}
    </select></Field>
    <Field title="Policy name"><input value={name} required onChange={event => setName(event.target.value)} /></Field>
    <Field title="Command"><select value={command} onChange={event => setCommand(event.target.value)}>
      {commands.map(value => <option key={value}>{value}</option>)}
    </select></Field>
    <Field title="Target roles" note={`Separate role names with commas. Common roles include ${suggestedRoles.join(', ')}.`}>
      <input value={rolesText} required onChange={event => setRolesText(event.target.value)} />
    </Field>
    {usesUsing && <Field title="USING expression" note="Which existing rows the policy applies to."><textarea className="mono" rows="3" value={using} onChange={event => setUsing(event.target.value)} /></Field>}
    {usesCheck && <Field title="WITH CHECK expression" note={command === 'INSERT' ? 'Which new rows the policy allows.' : 'Optional. If empty, PostgreSQL uses the USING expression for new rows.'}>
      <textarea className="mono" rows="3" value={check} onChange={event => setCheck(event.target.value)} />
    </Field>}
    <div><h3>SQL preview</h3>{target?.type === 'bucket' && <p className="muted">Bucket scope is saved for {target.item.name || target.item.id}.</p>}<pre className="sql-preview">{preview}</pre></div>
  </Dialog>
}
