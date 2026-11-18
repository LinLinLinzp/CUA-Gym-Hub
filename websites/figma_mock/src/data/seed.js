const colors = ['#F2C1AA', '#C9B5E3', '#BCD1B0', '#F1D28D', '#B9D6EC', '#ECC2D1']
const people = [
  ['maya', 'Maya Chen'], ['jules', 'Jules Bennett'], ['serena', 'Serena Park'],
  ['nolan', 'Nolan Reyes'], ['inez', 'Inez Silva'], ['samir', 'Samir Khan'],
  ['leah', 'Leah Rosen'], ['theo', 'Theo Brooks'], ['priya', 'Priya Shah'],
  ['devon', 'Devon Fields'], ['uma', 'Uma Rao'], ['morgan', 'Morgan Ellis'],
  ['amira', 'Amira Haddad'], ['hugo', 'Hugo Martins'], ['lena', 'Lena Fischer'],
  ['nia', 'Nia Okafor'], ['owen', 'Owen Blake'], ['marisol', 'Marisol Vega'],
  ['eden', 'Eden West'], ['kaia', 'Kaia Larsen'], ['mateo', 'Mateo Cruz'],
  ['rin', 'Rin Yamamoto'], ['zoe', 'Zoe Grant'], ['cleo', 'Cleo Ward'],
]
const folderData = [
  ['commerce', 'Commerce', 'Checkout and account journeys'],
  ['design-system', 'Field Design System', 'Shared components and foundations'],
  ['growth', 'Product Growth', 'Activation and lifecycle'],
  ['research', 'Research', 'Interviews and customer journeys'],
  ['brand', 'Brand', 'Identity and campaigns'],
  ['platform', 'Platform', 'Internal tools and reporting'],
  ['explorations', 'Explorations', 'Space for new ideas'],
  ['studio-archive', 'Studio Archive', 'Retired work'],
]
const briefs = [
  ['checkout', 'Checkout Refresh', 0, 'checkout'], ['field-kit', 'Field UI Kit', 1, 'component-board'],
  ['onboarding', 'Account Onboarding', 2, 'onboarding'], ['operations', 'Operations Dashboard', 5, 'dashboard'],
  ['wayfinding', 'Wayfinding Atlas', 3, 'travel-map'], ['editorial-type', 'Editorial Typography', 4, 'type-specimen'],
  ['order-history', 'Order History', 0, 'dashboard'], ['help-center', 'Help Center Patterns', 1, 'component-board'],
  ['welcome-email', 'Welcome Email Series', 2, 'type-specimen'], ['field-notes', 'Field Research Notes', 3, 'travel-map'],
  ['campaign', 'Spring Campaign', 4, 'type-specimen'], ['inventory', 'Inventory Overview', 5, 'dashboard'],
  ['wallet', 'Wallet and Payments', 0, 'checkout'], ['tokens', 'Color Token Studies', 1, 'component-board'],
  ['referrals', 'Referral Journey', 2, 'onboarding'], ['commute', 'Commuter Study', 3, 'travel-map'],
  ['packaging', 'Packaging Labels', 4, 'type-specimen'], ['forecast', 'Demand Forecast', 5, 'dashboard'],
  ['receipt', 'Digital Receipts', 0, 'checkout'], ['icons', 'Icon Foundations', 1, 'component-board'],
  ['activation', 'Activation Checklist', 2, 'onboarding'], ['interviews', 'Interview Synthesis', 3, 'travel-map'],
  ['signage', 'Event Signage', 4, 'type-specimen'], ['staffing', 'Staffing Planner', 5, 'dashboard'],
  ['membership', 'Membership Checkout', 0, 'checkout'], ['forms', 'Form Patterns', 1, 'component-board'],
  ['trial', 'Trial Experience', 2, 'onboarding'], ['pathways', 'Customer Pathways', 3, 'travel-map'],
  ['guide', 'Voice and Tone', 4, 'type-specimen'], ['reporting', 'Reporting Navigation', 5, 'dashboard'],
  ['saved-items', 'Saved Items', 0, 'checkout'], ['tables', 'Data Table Library', 1, 'component-board'],
  ['survey', 'Exit Survey', 2, 'onboarding'], ['partner-study', 'Partner Journey Study', 3, 'travel-map'],
  ['identity', 'Identity Applications', 4, 'type-specimen'], ['restricted', 'Quarterly Planning', 5, 'dashboard'],
  ['notes', 'Canvas Notes', null, 'blank'], ['gesture', 'Gesture Experiments', null, 'onboarding'],
  ['labels', 'Label Studies', null, 'type-specimen'], ['map-ideas', 'Mapping Ideas', null, 'travel-map'],
  ['payment-ideas', 'Payment Concepts', null, 'checkout'], ['status', 'Status Indicators', null, 'component-board'],
  ['pulse', 'Studio Pulse', null, 'dashboard'], ['welcome-sketch', 'Welcome Sketches', null, 'onboarding'],
  ['old-cart', 'Early Cart Concept', 0, 'checkout'], ['old-kit', 'Legacy Pattern Set', 1, 'component-board'],
  ['old-map', 'Regional Study Draft', 7, 'travel-map'], ['old-brief', 'Sprint Brief', null, 'type-specimen'],
]
const componentNames = [
  'Button / Primary', 'Button / Secondary', 'Input / Email', 'Navigation / Tab', 'Badge / Status',
  'Card / Summary', 'Toggle / Setting', 'Menu / Item', 'Control / Checkbox', 'Avatar / Small',
  'Banner / Notice', 'Chip / Filter', 'Progress / Step', 'Card / Metric', 'Input / Search',
]
const feedback = [
  'Could we clarify the total above the pay button?', 'The spacing here feels tight at smaller widths.',
  'Can we give this heading a little more room?', 'This will need a clear empty state.',
  'The new wording reads well in the flow.', 'Let’s include the customer’s next step here.',
  'Can we use the same alignment on the second screen?', 'The darker color is easier to scan.',
  'Could we leave room for longer labels?', 'Please check this against the updated content.',
  'Can we make the secondary action easier to find?', 'This area could use a shorter label.',
  'Let’s use the compact version in the review.', 'The hierarchy works well with this spacing.',
]
const repliesText = [
  'I’ll add the subtotal and shipping breakdown.', 'I’ll include that in the next pass.',
  'Agreed. I’ll check the narrow layout too.', 'Thanks, I’ve added it to the review notes.',
  'I’ll bring an updated option to the next review.', 'That matches what we heard in the interviews.',
]
const maya = 'user-maya'
const time = (offset) => new Date(Date.UTC(2026, 9, 28, 16) - offset * 35 * 3600000).toISOString()
const audit = (offset, actor = maya) => ({
  createdAt: time(offset + 14), updatedAt: time(offset), createdById: actor, updatedById: actor,
})
const padded = (n) => String(n).padStart(3, '0')
const lifecycle = { trashedAt: null, trashedById: null, restoredAt: null, restoredById: null }

export function createInitialData() {
  const users = people.map(([key, name], index) => ({
    id: 'user-' + key, name, email: name.toLowerCase().replaceAll(' ', '.') + '@example.test', avatarColor: colors[index % colors.length],
  }))
  const folders = folderData.map(([key, name, description], index) => ({
    id: 'folder-' + key, name, description, status: index === 7 ? 'archived' : 'active', ...audit(index),
  }))
  const files = briefs.map(([key, name, folder, preview], index) => {
    const ownerId = index === 7 || index === 35 ? 'user-jules' : maya
    const shared = index === 10 || index === 21
    return {
      id: 'file-' + key, name, ownerId, preview, folderId: folders[folder]?.id ?? null, sourceFileId: null,
      status: index >= 44 ? 'trashed' : 'active', ...lifecycle, ...audit(index, ownerId),
      ...(index >= 44 ? { trashedAt: time(index), trashedById: maya } : {}),
      linkAccess: { audience: shared ? 'anyone' : 'invited', role: shared ? 'view' : null, updatedAt: time(index), updatedById: ownerId },
    }
  })
  const pages = files.flatMap((file, index) => {
    const key = briefs[index][0]
    const titles = index === 0 ? ['Mobile checkout', 'Desktop checkout', 'Order confirmation']
      : index === 1 ? ['Core controls', 'Inputs', 'Navigation']
      : index === 2 ? ['Welcome', 'Setup checklist', 'Completion']
      : index === 3 ? ['Overview', 'Activity', 'Reports']
      : index === 36 ? ['Page 1', 'Sketches']
      : ['Overview', 'Explorations']
    return titles.map((name, position) => ({
      id: 'page-' + key + '-' + (index === 0 && position === 0 ? 'mobile' : index === 1 && position === 0 ? 'core' : position + 1),
      fileId: file.id, name, position, ...audit(index, file.ownerId),
    }))
  })
  const layers = pages.flatMap((page, index) => {
    if (page.id === 'page-notes-1') return []
    const checkout = page.id === 'page-checkout-mobile'
    const count = checkout ? 4 : 2
    return Array.from({ length: count }, (_, position) => {
      const id = checkout && position === 2 ? 'layer-checkout-pay'
        : page.id === 'page-field-kit-core' && position === 0 ? 'layer-field-kit-primary'
        : 'layer-' + page.id.slice(5) + '-' + (position + 1)
      const kind = checkout ? ['frame', 'text', 'shape', 'text'][position] : position === 0 ? 'shape' : 'text'
      const names = checkout ? ['Checkout panel', 'Order summary', 'Pay now button', 'Shipping and taxes'] : ['Feature panel', 'Section title']
      const geometries = checkout
        ? [{ x: 48, y: 45, width: 365, height: 474 }, { x: 84, y: 102, width: 256, height: 55 }, { x: 84, y: 424, width: 256, height: 42 }, { x: 84, y: 224, width: 256, height: 55 }]
        : [{ x: 100, y: 92, width: 300, height: 70 }, { x: 100, y: 206, width: 300, height: 60 }]
      return {
        id, fileId: page.fileId, pageId: page.id, parentLayerId: checkout && position > 0 ? 'layer-checkout-mobile-1' : null,
        name: names[position], kind, componentId: null, position, geometry: geometries[position],
        fill: kind === 'text' ? null : checkout ? (position === 0 ? '#fff0e5' : '#e39981') : colors[index % colors.length],
        text: kind === 'text' ? (checkout ? names[position] : page.name) : id === 'layer-checkout-pay' ? 'Pay now' : null,
        ...audit(index),
      }
    })
  })
  const mains = layers.filter((layer) => layer.fileId !== 'file-checkout' && layer.kind === 'shape' && layer.fileId !== 'file-restricted')
  const selected = [...mains.filter((layer) => layer.fileId === 'file-field-kit'), ...mains.filter((layer) => layer.fileId !== 'file-field-kit')].slice(0, 42)
  const components = selected.map((layer, index) => {
    const id = index === 0 ? 'component-primary-button' : 'component-' + padded(index + 1)
    const name = componentNames[index % componentNames.length] + (index >= componentNames.length ? ' · ' + files.find((file) => file.id === layer.fileId).name : '')
    const published = index < 16
    Object.assign(layer, { name, kind: 'component', componentId: id })
    if (index === 0) Object.assign(layer, { text: 'Continue', fill: '#DAC7F2', geometry: { x: 100, y: 92, width: 240, height: 62 } })
    return {
      id, fileId: layer.fileId, pageId: layer.pageId, mainLayerId: layer.id, name,
      description: index === 0 ? 'Primary action for checkout' : 'Reusable pattern for ' + files.find((file) => file.id === layer.fileId).name,
      status: published ? 'published' : 'local', publishedAt: published ? time(index) : null,
      publishedById: published ? maya : null, ...audit(index),
    }
  })
  for (const [layerId, component] of [['layer-checkout-2-1', components[0]], ['layer-field-kit-3-2', components[2]], ['layer-welcome-sketch-2-1', components[0]]]) {
    const layer = layers.find((candidate) => candidate.id === layerId)
    Object.assign(layer, { componentId: component.id, kind: 'instance', name: component.name })
  }

  const commentThreads = Array.from({ length: 42 }, (_, index) => {
    const page = pages[index < 4 ? 0 : index < 6 ? 1 : index - 3]
    const resolved = index > 0 && index % 4 === 0
    return {
      id: index === 0 ? 'thread-checkout-001' : 'thread-' + padded(index + 1), fileId: page.fileId, pageId: page.id,
      layerId: index === 0 ? 'layer-checkout-pay' : null,
      x: index === 0 ? 0.22 : 0.36 + (index % 6) * 0.082, y: index === 0 ? 0.74 : 0.24 + (index % 4) * 0.155,
      body: feedback[index % feedback.length], status: resolved ? 'resolved' : 'open',
      resolvedAt: resolved ? time(index) : null, resolvedById: resolved ? maya : null,
      reopenedAt: null, reopenedById: null, ...audit(index, users[(index + 1) % users.length].id),
    }
  })
  const commentReplies = Array.from({ length: 72 }, (_, index) => ({
    id: index === 0 ? 'reply-checkout-001' : 'reply-' + padded(index + 1),
    threadId: commentThreads[index % 36].id, body: repliesText[index % repliesText.length], ...audit(index < 36 ? index - 15 : index - 55, users[index % users.length].id),
  }))
  const fileAccess = Array.from({ length: 64 }, (_, index) => {
    const file = index < 3 ? files[0] : index === 3 ? files[7] : files[1 + ((index - 4) % 34)]
    const person = index === 0 ? users[1] : index === 1 ? users[3] : index === 3 ? users[0] : users[2 + (index % 22)]
    const pending = index === 2 || (index > 3 && index % 15 === 0)
    const removed = index > 3 && index % 13 === 0
    return {
      id: index === 0 ? 'access-checkout-001' : 'access-' + padded(index + 1),
      fileId: file.id, userId: pending ? null : person.id,
      email: pending ? (index === 2 ? 'reviewer' : 'review-' + index) + '@example.test' : person.email,
      role: index % 3 === 0 && index !== 3 ? 'edit' : 'view', status: removed ? 'removed' : pending ? 'pending' : 'active',
      removedAt: removed ? time(index) : null, removedById: removed ? maya : null, ...audit(index, file.ownerId),
    }
  })
  const fileStars = Array.from({ length: 14 }, (_, index) => {
    const userId = index < 9 ? maya : users[index].id
    return {
      id: 'star-' + padded(index + 1), fileId: files[index].id, userId,
      status: index > 0 && index % 4 === 0 ? 'unstarred' : 'starred', ...audit(index, userId),
    }
  })
  return { account: { currentUserId: maya, workspaceName: 'Commonfield Studio' }, users, folders, files, pages, layers, components, commentThreads, commentReplies, fileAccess, fileStars }
}

