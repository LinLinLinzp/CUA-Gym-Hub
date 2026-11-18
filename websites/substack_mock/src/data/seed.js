import { articles } from './articles.js'

const publicationId = 'pub_sunday_margins'
const ownerId = 'usr_mara'
const contributorId = 'usr_jonah'
const origin = Date.parse('2026-11-18T12:00:00.000Z')
const day = 86400000
const at = (days, hours = 0) => new Date(origin + days * day + hours * 3600000).toISOString()
const seedId = (prefix, index) => `${prefix}_${String(index + 1).padStart(3, '0')}`
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const images = { Film: 'film', Art: 'art', Books: 'books', 'City Life': 'city' }
const firstNames = ['Imani', 'Theo', 'Lucia', 'Clara', 'Gabriel', 'Ellen', 'Noor', 'Mateo', 'Sophie', 'Nina', 'Ravi', 'Julian', 'Nora', 'Elena', 'Max', 'Maeve', 'Cora', 'Anton', 'Ana', 'Iris', 'Yara']
const lastNames = ['Cole', 'Park', 'Reyes', 'Voss', 'Mendez', 'Holt', 'Khan', 'Briggs', 'Leung', 'Ortiz', 'Patel', 'Keller', 'Lin', 'Ruiz', 'Foster', 'Kavanagh', 'Reed', 'Mills', 'Bennett', 'Singh', 'Dawson']
const countries = ['United States', 'Canada', 'United Kingdom', 'Ireland', 'Australia']
const sources = ['web', 'recommendation', 'app', 'web', 'csv', 'manual']

const commentsByTopic = {
  Film: ['Our old rental store sent overdue notices by postcard.', 'I remember the last screening ending while the sun was still out.', 'I have been looking for a print of this for years.', 'The sound in a small theater is one of the reasons I keep going back.', 'We used to plan whole weekends around the matinee.', 'I would love to see the program notes from this screening.'],
  Art: ['I went back this week and spent most of the visit in the first room.', 'The label made me notice a detail I had missed completely.', 'There is a little exhibition near us with this same kind of light.', 'I used to walk past that building every morning without going in.', 'The works on paper were my favorite part of the visit.', 'It was lovely to read about a show you can see in one lunch break.'],
  Books: ['I found my copy on the shelf at the library sale.', 'The last chapter was the one I wanted to talk about with everyone.', 'There is a really good conversation with the translator in the paperback.', 'I read this on a night train and could still describe the compartment.', 'My old reading group would have argued about that line for an hour.', 'The shop near the station keeps the whole series on one shelf.'],
  'City Life': ['That corner feels completely different before the shops open.', 'The bus still stops there, although the stop sign moved last winter.', 'I am going to try this route on the first dry Saturday.', 'My grandmother remembers the old lettering above the doorway.', 'It is worth doubling back for a look at the passage behind the market.', 'There is a bench opposite the wide window now.'],
}
const replyBodies = [
  'I remember that too. I wish someone had kept a photograph.',
  'Thanks for bringing this back to mind. I had forgotten that detail.',
  'That is exactly what I noticed when I went back last Saturday.',
  'I asked around after reading this and a friend had the original leaflet.',
  'I have added that to my list for the next visit.',
  'I am glad you mentioned it. My copy has the same mark in the margin.',
]
const reportReasons = ['Repeated promotional links', 'Off-topic promotion', 'Disruptive reply', 'Unsolicited advertising']

export function createInitialData() {
  const publication = {
    id: publicationId, ownerId, name: 'The Sunday Margins', slug: 'the-sunday-margins',
    description: 'Close readings of books, films, and city life.', currency: 'USD', commentsEnabled: true,
    createdAt: '2024-10-01T14:00:00.000Z', updatedAt: at(-32), updatedById: ownerId,
  }
  const users = [
    { id: ownerId, name: 'Mara Ellis', handle: 'maraellis', role: 'owner' },
    { id: contributorId, name: 'Jonah Mercer', handle: 'jonahmercer', role: 'contributor' },
  ]
  const posts = articles.map(([title, subtitle, body, lead], index) => {
    const authorId = index % 7 === 4 ? contributorId : ownerId
    const status = index < 29 ? 'published' : index < 38 ? 'draft' : 'scheduled'
    const publishedAt = status === 'published' ? at(-2 - index * 5) : null
    const updatedAt = publishedAt || at(-1 - (index - 29))
    const audience = index === 1 || index % 9 === 6 ? 'paid' : index % 13 === 9 ? 'founding' : index % 8 === 5 ? 'free' : 'everyone'
    return {
      id: seedId('post', index), publicationId, authorId, slug: slug(title),
      title, subtitle, bodyHtml: `<p>${lead}</p>`,
      ...(index % 9 !== 8 ? { thumbnailPath: `/images/${images[body]}.webp` } : {}),
      tags: index % 4 === 0 && body !== 'City Life' ? [body, 'City Life'] : [body],
      status, audience, commentPolicy: audience === 'free' ? 'subscribers' : audience,
      sendByEmailAndApp: index % 11 !== 8,
      createdAt: at(status === 'published' ? -9 - index * 5 : -15 - (index - 29)),
      createdById: authorId, updatedAt, updatedById: authorId,
      scheduledAt: status === 'scheduled' ? at(4 + (index - 38) * 7) : null,
      publishedAt, deliveryAt: index % 11 !== 8 ? publishedAt : null,
      deletedAt: null, duplicatedFromId: null,
      metrics: status === 'published' && index !== 17 ? {
        views: [1684, 1192, 926, 1475, 814, 698][index] ?? 620 + (index * 173) % 980,
        recipients: index === 24 ? 0 : 77 - index,
        ...(index % 7 === 6 ? {} : { opens: index === 24 ? 0 : 40 - index % 19 }),
        newSubscribers: index % 6,
      } : null,
    }
  })
  const subscribers = Array.from({ length: 84 }, (_, index) => {
    const group = Math.floor(index / firstNames.length)
    const source = index < 3 ? 'web' : sources[(index + group) % sources.length]
    const name = `${firstNames[index % firstNames.length]} ${lastNames[(index + group * 5) % lastNames.length]}`
    const userId = index < 24 ? (['usr_imani', 'usr_theo', 'usr_lucia'][index] || seedId('usr_reader', index)) : null
    if (userId) users.push({ id: userId, name, handle: slug(name).replaceAll('-', ''), role: 'reader' })
    const baseType = index === 1 || (index >= 55 && index <= 72) ? 'paid'
      : index >= 73 && index <= 76 ? 'founding'
      : index >= 77 && index <= 81 ? 'trial' : 'free'
    const paid = baseType === 'paid' || baseType === 'founding'
    const annual = index % 4 === 0 || baseType === 'founding'
    const removed = index >= 82
    const joinedAt = at(baseType === 'trial' ? -1 - index % 4 : -8 - (index * 29) % 725)
    const email = index === 57 ? 'sophie.reed.weekend-reading-circulation@example.test' : `${slug(name).replaceAll('-', '.')}@example.test`
    return {
      id: seedId('sub', index), publicationId, userId, email, name,
      status: removed ? 'removed' : 'active', baseType, source,
      country: countries[(index + group) % countries.length],
      joinedAt, createdAt: joinedAt, ...(source === 'manual' || source === 'csv' ? { createdById: ownerId } : {}),
      updatedAt: removed ? at(-7 - (index - 82)) : joinedAt,
      ...(paid && index !== 70 ? {
        billingInterval: annual ? 'annual' : 'monthly',
        paidPeriodStartedAt: at(annual ? -72 - index % 14 : -18 - index % 3),
        paidThroughAt: at(annual ? 293 - index % 14 : 12 - index % 3),
        periodAmount: annual ? (baseType === 'founding' ? '144.00' : '80.00') : '8.00',
        totalRevenue: (annual ? (baseType === 'founding' ? 144 : 80) : (index % 12 + 1) * 8).toFixed(2),
      } : {}),
      ...(baseType === 'trial' ? { trialEndsAt: at(9 + index % 22) } : {}),
      ...(index % 17 === 14 ? {} : { activityScore: index === 0 ? 5 : (index * 7 + group) % 6, emailOpens30d: (index * 11) % 25 }),
      ...(removed ? { removedAt: at(-7 - (index - 82)), removedById: ownerId, updatedById: ownerId } : {}),
    }
  })
  const compSubscriptions = Array.from({ length: 26 }, (_, index) => {
    const current = index < 14
    const upcoming = index >= 14 && index < 18
    const revoked = index >= 23
    const subscriber = subscribers[upcoming ? 55 + index - 14 : index < 14 ? index + 2 : index - 2]
    const duration = index === 1 ? 'forever' : current ? '90d' : '30d'
    const startsAt = upcoming ? subscriber.paidThroughAt : current ? at(-30 - index) : at(-53 - index)
    const endsAt = duration === 'forever' ? null : new Date(Date.parse(startsAt) + (current ? 90 : 30) * day).toISOString()
    const createdAt = upcoming ? at(-5 - index % 4) : startsAt
    return {
      id: seedId('comp', index), publicationId, subscriberId: subscriber.id,
      status: revoked ? 'revoked' : 'granted', tier: index % 7 === 3 ? 'founding' : 'paid', duration,
      startsAt, endsAt, amount: '0.00', currency: 'USD',
      createdAt, createdById: ownerId, updatedAt: revoked ? at(-50) : createdAt, updatedById: ownerId,
      ...(revoked ? { revokedAt: at(-50), revokedById: ownerId } : {}),
    }
  })
  const comments = Array.from({ length: 120 }, (_, index) => {
    const post = posts[Math.floor(index / 6)]
    const position = index % 6
    const parentId = position === 2 || position === 3 ? seedId('cmt', index - position + 1) : null
    const pinned = [0, 6, 24, 30].includes(index)
    const status = (index >= 112 && index !== 113) || index === 97 ? 'removed' : index >= 100 && index < 112 ? 'hidden' : 'visible'
    const reviewStatus = index >= 8 && index < 16 ? 'reported' : index >= 16 && index < 21 ? 'approved' : 'none'
    const createdAt = new Date(Date.parse(post.publishedAt) + (position + 1) * 3600000).toISOString()
    const moderatedAt = status === 'visible' && reviewStatus !== 'approved' ? null : at(-1 - index % 4)
    const pinnedAt = pinned ? at(-1 - index / 6) : null
    return {
      id: seedId('cmt', index), publicationId, postId: post.id,
      authorId: index === 0 ? ownerId : users[2 + (index + Math.floor(index / 6)) % (users.length - 2)].id,
      parentId,
      body: index === 0 ? 'A correction for readers looking for the shop: it was on the east side of Ashland, two doors down from the bakery. I have amended the address in my notes.'
        : status === 'hidden' ? 'I am promoting my mailing list here. Message me for the signup details.' : parentId ? replyBodies[index % replyBodies.length] : commentsByTopic[post.tags[0]][(index + Math.floor(index / 6)) % 6],
      status, reviewStatus, createdAt, updatedAt: moderatedAt || pinnedAt || createdAt,
      ...(reviewStatus === 'reported' ? { reportReason: reportReasons[index % reportReasons.length] } : {}),
      ...(pinned ? { pinnedAt, pinnedById: ownerId } : {}),
      ...(moderatedAt ? { moderatedAt, moderatedById: ownerId } : {}),
    }
  })
  const events = [
    ...compSubscriptions.slice(0, 3).map((comp, index) => {
      const { subscriberId, startsAt, endsAt, duration, tier, amount, currency } = comp
      return {
        id: seedId('evt', index), type: 'comp.granted', publicationId, actorId: ownerId,
        createdAt: comp.createdAt, entityId: comp.id,
        details: { compId: comp.id, subscriberId, startsAt, endsAt, duration, tier, amount, currency },
      }
    }),
    ...comments.filter(comment => comment.reviewStatus === 'approved').map((comment, index) => ({
      id: seedId('evt', index + 3), type: 'comment.approved', publicationId, actorId: ownerId,
      createdAt: comment.moderatedAt, entityId: comment.id,
      details: { postId: comment.postId, commentId: comment.id, reviewStatus: 'approved' },
    })),
  ]
  return { currentUserId: ownerId, publication, users, posts, subscribers, compSubscriptions, comments, events }
}
