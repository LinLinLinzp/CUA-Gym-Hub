import { useState } from 'react'
import { useAccount } from '../account.jsx'
import { claimQuest, joinQuest, nudgeMessages, nudgeQuest } from '../actions.js'
import {
  displayDate, eligibleFriends, friendName, matches, metricName, number, questName,
  questPartner, questProgress, questStatus, records,
} from '../model.js'
import { Avatar, Badge, Empty, Modal, PageHead, Progress } from '../ui.jsx'

export const questLabels = {
  available: 'Available', active: 'In progress', completed: 'Ready to claim',
  claimed: 'Reward claimed', expired: 'Ended', upcoming: 'Upcoming', unavailable: 'Unavailable',
}

function QuestTime({ quest, status }) {
  const start = displayDate(quest.startsAt)
  const end = displayDate(quest.endsAt)
  if (status === 'upcoming' && start) return <p className="caption">Starts {start}</p>
  if (status === 'completed' || status === 'claimed') {
    const date = displayDate(quest.completedAt)
    return date ? <p className="caption">Completed {date}</p> : null
  }
  if (end) return <p className="caption">{status === 'expired' ? 'Ended' : 'Ends'} {end}</p>
  return null
}

function QuestCard({ state, quest, status, onChoose, onNudge, onClaim }) {
  const partner = questPartner(state, quest)
  const progress = questProgress(state, quest)
  const unit = metricName(quest.metric)
  const learner = state.profile.displayName || 'You'
  const partnerLabel = friendName(partner)
  const lastNudge = records(state.questNudges).findLast(row => row.questId === quest.id && row.actorId === state.profile.id)
  return <article className={'card quest-card ' + (status === 'active' ? 'quest-active' : '')} aria-label={questName(quest)}>
    <div className="between"><Badge tone={status === 'completed' ? 'apricot' : 'green'}>{questLabels[status]}</Badge>
      <Badge tone="apricot"><span aria-hidden="true">◆</span>&nbsp;{Math.max(0, number(quest.rewardGems))} gems</Badge>
    </div>
    <div>
      <h3>{questName(quest)}</h3>
      <QuestTime quest={quest} status={status} />
      {status === 'available' && <p className="caption">Target {number(quest.target)} {unit}</p>}
    </div>
    {status === 'active' && <>
      <Progress value={progress.total} target={quest.target} unit={unit} />
      {lastNudge && <p className="caption">Nudge sent {displayDate(lastNudge.createdAt)} · {lastNudge.message}</p>}
      <div className="participant-grid">
        <div className="participant"><Avatar name={learner} tone="green" /><div><strong>{learner}</strong><p className="caption">{progress.own} {unit} · You</p></div></div>
        <div className="participant"><Avatar name={partnerLabel} /><div><strong>{partnerLabel}</strong><p className="caption">{progress.partner} {unit}</p></div></div>
      </div>
    </>}
    {status === 'completed' && <Progress value={progress.total} target={quest.target} unit={unit} />}
    <div className="actions">
      {status === 'available' && <button onClick={onChoose}>Choose partner</button>}
      {status === 'active' && <button onClick={onNudge} disabled={!partner}>Send nudge</button>}
      {status === 'completed' && !quest.claimedAt && <button className="primary" onClick={onClaim}>Claim reward</button>}
    </div>
  </article>
}

function PartnerDialog({ state, quest, close, save }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const friends = eligibleFriends(state)
  const visible = friends.filter(friend => matches(query, friend.displayName, friend.username, friend.courseName))
    .sort((a, b) => friendName(a).localeCompare(friendName(b)))
  const selected = friends.find(friend => friend.id === selectedId)
  return <Modal title="Choose partner" onClose={close}>
    <form className="stack" onSubmit={event => { event.preventDefault(); if (selected) save(selected.id) }}>
      <p className="muted">{questName(quest)}</p>
      <label className="field">Search friends<input autoFocus type="search" placeholder="Name, username, or course" value={query} onChange={event => setQuery(event.target.value)} /></label>
      {visible.length ? <fieldset className="answer-list roster">
        <legend>Eligible friends</legend>
        {visible.map(friend => <label className="choice" key={friend.id}>
          <input type="radio" name="partner" checked={selectedId === friend.id} onChange={() => setSelectedId(friend.id)} />
          <Avatar name={friendName(friend)} />
          <span><strong>{friendName(friend)}</strong><span className="caption friend-details">{[friend.username && '@' + friend.username, friend.courseName].filter(Boolean).join(' · ')}</span></span>
        </label>)}
      </fieldset> : <Empty>{friends.length ? 'No eligible friends match your search.' : 'No eligible friends are available for this quest.'}</Empty>}
      {selected && <p className="caption">Selected {friendName(selected)}</p>}
      <div className="actions dialog-actions">
        <button type="button" onClick={close}>Cancel</button>
        <button className="primary" disabled={!selected}>Save partner</button>
      </div>
    </form>
  </Modal>
}

function NudgeDialog({ partner, close, send }) {
  const [key, setKey] = useState('practice')
  return <Modal title="Send nudge" onClose={close}>
    <form className="stack" onSubmit={event => { event.preventDefault(); send(key) }}>
      <p className="muted">Choose a reminder for {friendName(partner)}.</p>
      <fieldset className="answer-list">
        <legend>Message</legend>
        {Object.entries(nudgeMessages).map(([preset, message]) => <label className="choice" key={preset}>
          <input type="radio" name="nudge" checked={key === preset} onChange={() => setKey(preset)} />{message}
        </label>)}
      </fieldset>
      <div className="actions dialog-actions">
        <button type="button" onClick={close}>Cancel</button>
        <button className="primary">Send nudge</button>
      </div>
    </form>
  </Modal>
}

export function FriendsQuests() {
  const { state, commit, notify } = useAccount()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [choosing, setChoosing] = useState(null)
  const [nudging, setNudging] = useState(null)
  const now = new Date()
  const quests = records(state.friendQuests).map(quest => ({ quest, status: questStatus(quest, now) }))
  const active = quests.filter(({ status }) => status === 'active')
  const ready = quests.filter(({ status }) => status === 'completed')
  const available = quests.filter(({ status }) => status === 'available')
  const history = quests.filter(({ status }) => status !== 'available' && status !== 'active')
  const filtered = history.filter(({ quest, status }) => (filter === 'all' || status === filter)
    && matches(query, quest.title, questLabels[status], friendName(questPartner(state, quest)), metricName(quest.metric)))
    .sort((a, b) => String(b.quest.completedAt || b.quest.endsAt || '').localeCompare(String(a.quest.completedAt || a.quest.endsAt || '')))

  function card({ quest, status }) {
    return <QuestCard key={quest.id} state={state} quest={quest} status={status}
      onChoose={() => setChoosing(quest)} onNudge={() => setNudging(quest)}
      onClaim={() => commit((current, time) => claimQuest(current, time, quest.id), 'Reward added to your gems.')} />
  }

  return <>
    <PageHead title="Friends Quests">Practice together and share the rewards.</PageHead>
    <section aria-labelledby="active-quests">
      <h2 className="section-title" id="active-quests">Shared challenges</h2>
      {active.length ? <div className="grid two">{active.map(card)}</div> : <Empty>No shared challenge in progress. Choose a partner to start one.</Empty>}
    </section>
    {ready.length > 0 && <section className="section" aria-labelledby="quest-rewards">
      <h2 className="section-title" id="quest-rewards">Rewards to claim</h2>
      <div className="grid two">{ready.map(card)}</div>
    </section>}
    <section className="section" aria-labelledby="join-quests">
      <h2 className="section-title" id="join-quests">Ready to join</h2>
      {available.length ? <div className="grid three">{available.map(card)}</div> : <Empty>No challenges are ready to join.</Empty>}
    </section>
    <section className="section" aria-labelledby="quest-history">
      <h2 id="quest-history">Quest history</h2>
      <div className="filters">
        <label className="search">Search quest history<input type="search" placeholder="Challenge, partner, or metric" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <label><span id="quest-history-label">History status</span><select aria-labelledby="quest-history-label" value={filter} onChange={event => setFilter(event.target.value)}>
          <option value="all">All</option><option value="completed">Ready to claim</option><option value="claimed">Reward claimed</option>
          <option value="expired">Ended</option><option value="upcoming">Upcoming</option>
        </select></label>
      </div>
      {filtered.length ? <div className="card goal-list"><ul className="rows">
        {filtered.map(({ quest, status }) => <li className="quest-history-row" key={quest.id}>
          <div><h3>{questName(quest)}</h3><p className="caption">{quest.partnerId ? friendName(questPartner(state, quest)) : 'No partner selected'}</p><QuestTime quest={quest} status={status} /></div>
          <Progress value={questProgress(state, quest).total} target={quest.target} unit={metricName(quest.metric)} />
          <div><Badge tone={status === 'completed' ? 'apricot' : 'neutral'}>{questLabels[status] || 'Unavailable'}</Badge><p className="caption">◆ {Math.max(0, number(quest.rewardGems))} gems</p></div>
        </li>)}
      </ul></div> : <Empty>{history.length ? 'No quests match your filters.' : 'Finished and ended challenges will appear here.'}</Empty>}
    </section>
    {choosing && <PartnerDialog state={state} quest={choosing} close={() => setChoosing(null)} save={partnerId => {
      if (!commit((current, time) => joinQuest(current, time, choosing.id, partnerId), 'Friends Quest joined.')) {
        notify('This quest is no longer available to join.')
      }
      setChoosing(null)
    }} />}
    {nudging && <NudgeDialog partner={questPartner(state, nudging)} close={() => setNudging(null)} send={key => {
      if (!commit((current, time) => nudgeQuest(current, time, nudging.id, key), 'Nudge sent.')) {
        notify('This quest is no longer accepting nudges.')
      }
      setNudging(null)
    }} />}
  </>
}
