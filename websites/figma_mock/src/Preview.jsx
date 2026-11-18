const scenes = {
  checkout: ['FIELD MARKET', 'Your basket', 'Weekend tote', 'Delivery', 'Pay now'],
  dashboard: ['STUDIO OPERATIONS', 'At a glance', 'Weekly activity', 'Active projects'],
  'component-board': ['FIELD DESIGN SYSTEM', 'Core controls', 'Continue', 'Secondary', 'Available'],
  onboarding: ['COMMONFIELD', 'Make it yours', 'Set up your profile', 'Create a workspace', 'Bring your team'],
  'travel-map': ['NEIGHBORHOOD ATLAS', 'Along the river', 'North bank', 'Old town'],
  'type-specimen': ['COMMONFIELD TYPE STUDIES', 'Form & feeling', 'A study in rhythm and space'],
  blank: ['DESIGN FILE', 'Untitled canvas'],
}
export function Preview({ variant, compact }) {
  const style = Object.hasOwn(scenes, variant) ? variant : 'blank'
  const [kicker, title, first, second, third] = scenes[style]
  if (compact) return <div className={'preview swatch art-' + style} aria-hidden="true"><span>◇</span></div>
  return <div className={'preview art-' + style} aria-hidden="true">
    {style === 'checkout' && <><div className="art-caption"><span>{kicker}</span><strong>Everyday<br />essentials.</strong><i /></div><div className="mini-phone"><small>{kicker}</small><b>{title}</b><span className="mini-line"><i />{first}</span><span className="mini-line">{second}</span><em>{third}</em></div></>}
    {style === 'dashboard' && <div className="mini-dashboard"><div className="mini-sidebar">{kicker}<i /><i /><i /></div><div className="mini-report"><b>{title}</b><div className="mini-metrics"><span>24 <small>{second}</small></span><span>86% <small>Utilization</small></span></div><small>{first}</small><div className="bars">{[32, 66, 47, 87, 53, 75, 94, 80].map((height) => <i key={height} style={{ height: height + '%' }} />)}</div></div></div>}
    {style === 'component-board' && <div className="mini-board"><small>{kicker}</small><b>{title}</b><div><em>{first}</em><em>{second}</em></div><div><span>◆ {third}</span><i /><strong>↗</strong></div></div>}
    {style === 'onboarding' && <div className="mini-onboarding"><small>{kicker}</small><b>{title}</b>{[first, second, third].map((step, index) => <span key={step}><i>{index + 1}</i>{step}</span>)}</div>}
    {style === 'travel-map' && <><div className="mini-map"><i /><i /><i /><i /><span>{first}</span><span>{second}</span></div><div className="map-label"><small>{kicker}</small><b>{title}</b></div></>}
    {style === 'type-specimen' && <div className="mini-type"><small>{kicker}</small><strong>Aa</strong><b>{title}</b><span>{first}</span></div>}
    {style === 'blank' && <div className="mini-blank"><b>◇</b><small>{title}</small></div>}
  </div>
}

