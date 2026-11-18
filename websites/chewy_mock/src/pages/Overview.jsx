import React from 'react'
import { useAccount } from '../store'
import { date, list, orderLabel, today, validDay } from '../model'
import { Badge, ButtonLink, Empty, HeroArt, Icon, PageHeader, Portrait, SiteLink, routeId } from '../ui'

export function Overview() {
  const { state } = useAccount()
  const name = state.account?.firstName
  const now = today()
  const activePlans = list(state.autoships).filter(plan => plan.status === 'active')
  const next = activePlans.filter(plan => validDay(plan.nextShipDate) && plan.nextShipDate >= now)
    .sort((a, b) => a.nextShipDate.localeCompare(b.nextShipDate))[0]
  const recent = list(state.orders).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 3)
  const pets = list(state.pets).filter(pet => pet.status !== 'removed')
  return <>
    <PageHeader title={name ? 'Hi, ' + name + '!' : 'Your account'} description="Manage deliveries, orders, and profiles for your pets." />
    <section className="hero card" aria-labelledby="delivery-heading">
      <div className="hero-copy">
        <div className="hero-label"><Icon name="truck" size={19} />Next Autoship</div>
        <h2 id="delivery-heading">{next?.name || (next ? 'Scheduled delivery' : 'No upcoming deliveries')}</h2>
        {next ? <>
          <div className="hero-date"><Icon name="calendar" size={17} />{next.nextShipDate === now ? 'Ships today' : 'Ships ' + date(next.nextShipDate)}
            <span className="hero-dot" />{list(next.items).length} {list(next.items).length === 1 ? 'product' : 'products'}</div>
          <ButtonLink primary to={'/autoship/' + routeId(next.id)}>Manage delivery <Icon name="arrow" size={16} /></ButtonLink>
        </> : <><p>{activePlans.length ? 'View your active plans to update a delivery date.' : 'Your Autoship plans will appear here when they’re scheduled.'}</p><ButtonLink primary to="/autoship">View Autoship <Icon name="arrow" size={16} /></ButtonLink></>}
      </div>
      <HeroArt />
    </section>
    <div className="overview-grid">
      <section className="card overview-card">
        <div className="section-heading"><h2>Recent orders</h2><SiteLink to="/orders">View orders <Icon name="arrow" size={15} /></SiteLink></div>
        {!recent.length && <Empty title="No orders yet" />}
        <div className="overview-orders">{recent.map(order => <SiteLink key={order.id} to={'/orders/' + routeId(order.id)} className="overview-order">
          <span className="tile-icon"><Icon name="orders" size={21} /></span>
          <span className="order-cell"><strong>{orderLabel(order)}</strong><small>{list(order.items)[0]?.name || date(order.createdAt)}</small></span>
          <Badge status={order.status} />
        </SiteLink>)}</div>
      </section>
      <section className="card overview-card">
        <div className="section-heading"><h2>Your pets <sup>{pets.length}</sup></h2><SiteLink to="/pets">View profiles <Icon name="arrow" size={15} /></SiteLink></div>
        {!pets.length && <Empty title="No pet profiles yet"><SiteLink to="/pets/new">Add a pet</SiteLink></Empty>}
        <div className="mini-pets">{pets.slice(0, 3).map(pet => <SiteLink key={pet.id} to={'/pets/' + routeId(pet.id)}>
          <Portrait species={pet.species} /><strong>{pet.name || 'Pet profile'}</strong><small>{pet.species || 'Pet'}</small>
        </SiteLink>)}</div>
      </section>
    </div>
  </>
}

