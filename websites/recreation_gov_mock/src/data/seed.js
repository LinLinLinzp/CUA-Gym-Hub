const account = { id: 'acct-morgan', firstName: 'Morgan', lastName: 'Rivera', email: 'morgan.rivera@example.test' }
const createdAt = '2026-10-08T13:00:00.000Z'
const regions = [
  ['OR', 'Oakridge', 'South Fork Recreation Area', 'Cedar Bend', 'Silver Fork', 'America/Los_Angeles'],
  ['WA', 'Winthrop', 'Upper Methow Valley', 'Juniper Flat', 'High Meadow', 'America/Los_Angeles'],
  ['ME', 'Greenville', 'Moosehead Lake Region', 'Spruce Landing', 'Pine Fen', 'America/New_York'],
  ['CO', 'Salida', 'Upper Arkansas Valley', 'Granite Brook', 'Copper Ridge', 'America/Denver'],
  ['UT', 'Escalante', 'Boulder Mountain Region', 'Painted Bluff', 'Sandstone Narrows', 'America/Denver'],
  ['CA', 'Quincy', 'Northern Sierra Nevada', 'Alder Hollow', 'Quartz Basin', 'America/Los_Angeles'],
  ['ID', 'Stanley', 'Sawtooth Valley', 'Willow Bar', 'Echo Divide', 'America/Boise'],
  ['MT', 'Seeley Lake', 'Clearwater Valley', 'Larch Point', 'Glacier Run', 'America/Denver'],
  ['NM', 'Jemez Springs', 'Jemez Mountains', 'Mesa View', 'Red Pumice', 'America/Denver'],
  ['NC', 'Brevard', 'Blue Ridge Mountains', 'Fern Creek', 'Hemlock Gap', 'America/New_York'],
  ['VA', 'Luray', 'Shenandoah Valley', 'Fox Meadow', 'Laurel Crest', 'America/New_York'],
  ['MI', 'Munising', 'Lake Superior Shore', 'Birch Dunes', 'Otter Marsh', 'America/Detroit'],
]
const slug = (name) => name.toLowerCase().replaceAll(' ', '-')
const date = (month, day) => `2026-${month}-${String(day).padStart(2, '0')}`
const campPolicy = { code: 'camp-standard', cancellationFee: 10, lateDays: 1, lateForfeit: 'first_night' }
const permitPolicy = { code: 'permit-standard', cancellationFee: 0, lateDays: 2, lateForfeit: 'use_fee' }

export function createInitialData() {
  const facilities = []
  const units = []
  const reservations = []
  const lotteries = []
  const lotteryApplications = []
  const cancellations = []
  for (const [index, [state, locality, area, camp, permit, timeZone]] of regions.entries()) {
    const campSlug = slug(camp)
    const permitSlug = slug(permit)
    const campground = {
      id: `camp-${campSlug}`, kind: 'campsite', name: `${camp} Campground`,
      state, locality, area, timeZone, serviceFee: 8, policy: { ...campPolicy },
      availableFrom: '2026-01-01', availableThrough: '2027-12-31',
      description: `A small campground in the ${area}, with sheltered sites and access to local trails near ${locality}.`,
      rules: ['Check in after 2 p.m. and check out by noon.', 'Store food in approved containers.', 'Quiet hours are 10 p.m. to 7 a.m.'],
    }
    const destination = {
      id: `permit-${permitSlug}`, kind: 'permit', name: `${permit} Backcountry`,
      state, locality, area, timeZone, serviceFee: 6, policy: { ...permitPolicy },
      availableFrom: '2026-01-01', availableThrough: '2027-12-31',
      description: `Reserve entry to the backcountry near ${locality}. Each permit covers one group entering on the date shown.`,
      rules: ['Carry the permit on your entry day.', 'Stay within the group limit.', 'Pack out all waste.'],
    }
    facilities.push(campground, destination)
    const campUnits = [
      { id: index === 0 ? 'site-cedar-a12' : `site-${campSlug}-a12`, name: 'A12', category: 'Standard nonelectric', equipment: ['Tent', 'Small RV'], maxPartySize: 6, rate: 24 + index },
      { id: `site-${campSlug}-b04`, name: 'B04', category: 'RV electric', equipment: ['Small RV', 'Large RV', 'Trailer'], maxPartySize: 8, rate: 34 + index, blockedDates: ['2026-12-15'] },
      { id: `site-${campSlug}-c09`, name: 'C09', category: 'Walk-in tent', equipment: ['Tent'], maxPartySize: 4, rate: 19 + index },
    ].map((unit) => ({ ...unit, facilityId: campground.id, kind: campground.kind }))
    const permitUnits = [
      { id: `entry-${permitSlug}-west`, name: 'West Trailhead', maxPartySize: 6, dailyQuota: 12, rate: 5 + index },
      { id: `entry-${permitSlug}-creek`, name: 'Creek Crossing', maxPartySize: 4, dailyQuota: 8, rate: 7 + index, blockedDates: ['2026-12-15'] },
      { id: `entry-${permitSlug}-traverse`, name: `${permit} Traverse`, maxPartySize: 8, dailyQuota: 16, rate: 9 + index, allocation: 'lottery' },
    ].map((unit) => ({ ...unit, facilityId: destination.id, kind: destination.kind, category: 'Trailhead' }))
    units.push(...campUnits, ...permitUnits)

    const booking = (facility, unit, options) => {
      const quantity = options.quantity ?? 2
      const useAmount = quantity * unit.rate
      return {
        kind: facility.kind, facilityId: facility.id, unitId: unit.id, status: 'confirmed',
        actorId: account.id, partySize: facility.kind === 'permit' ? quantity : 4, quantity, currency: 'USD',
        unitAmount: unit.rate, useAmount, serviceFee: facility.serviceFee, totalAmount: useAmount + facility.serviceFee,
        policySnapshot: { ...facility.policy }, createdAt, updatedAt: createdAt, ...options,
      }
    }
    const upcomingCamp = booking(campground, campUnits[0], {
      id: index === 0 ? 'res-cedar-upcoming' : `res-${campSlug}-upcoming`,
      confirmationCode: index === 0 ? 'R-CEDAR124' : `R-CAMP${100 + index}`,
      startDate: date('12', index + 3), endDate: date('12', index + 5), equipment: 'Tent',
    })
    const upcomingPermit = booking(destination, permitUnits[0], {
      id: `res-${permitSlug}-upcoming`, confirmationCode: `R-PERMIT${100 + index}`,
      startDate: index === 11 ? '2026-11-19' : date('12', index + 6), quantity: 4,
    })
    const historical = booking(campground, campUnits[2], {
      id: `res-${campSlug}-history`, confirmationCode: `R-TRIP${100 + index}`,
      startDate: date('10', index + 10), endDate: date('10', index + 12), equipment: 'Tent',
    })
    if (index % 2 === 0) {
      const cancellationId = `cancel-${campSlug}-history`
      const cancelledAt = '2026-10-09T16:00:00.000Z'
      const lateFee = index === 0 ? historical.unitAmount : 0
      const deductionLines = [
        { code: 'service', quantity: 1, unitAmount: historical.serviceFee, amount: historical.serviceFee },
        { code: 'cancellation', quantity: 1, unitAmount: 10, amount: 10 },
      ]
      if (lateFee) deductionLines.push({ code: 'late_forfeit', quantity: 1, unitAmount: lateFee, amount: lateFee })
      cancellations.push({
        id: cancellationId, reservationId: historical.id, actorId: account.id, status: 'completed',
        createdAt: cancelledAt, policyCode: campPolicy.code, currency: 'USD', paidAmount: historical.totalAmount,
        chargeLines: [
          { code: 'use', quantity: 2, unitAmount: historical.unitAmount, amount: historical.useAmount },
          { code: 'service', quantity: 1, unitAmount: historical.serviceFee, amount: historical.serviceFee },
        ],
        deductionLines, refundAmount: historical.totalAmount - historical.serviceFee - 10 - lateFee,
      })
      Object.assign(historical, { status: 'cancelled', cancelledAt, updatedAt: cancelledAt, cancellationId })
    }
    reservations.push(upcomingCamp, upcomingPermit, historical)

    for (const [season, dates] of [['traverse', ['2027-06-12', '2027-06-19', '2027-06-26']], ['early-season', ['2027-05-22', '2027-05-29', '2027-06-05']]]) {
      const traversal = season === 'traverse'
      const pineAward = index === 2 && !traversal
      const open = traversal && index < 8
      const upcoming = traversal && index >= 8
      const title = `${permit} ${traversal ? 'Traverse' : 'Early Season'} Lottery`
      const lottery = {
        id: index === 1 && traversal ? 'lottery-high-meadow-open' : pineAward ? 'lottery-pine-fen' : `lottery-${permitSlug}-${season}`,
        title, facilityId: destination.id, unitId: permitUnits[2].id,
        opensAt: upcoming ? '2027-01-05T00:00:00.000Z' : '2026-10-01T00:00:00.000Z',
        closesAt: open || upcoming ? '2027-03-01T00:00:00.000Z' : '2026-10-31T00:00:00.000Z',
        resultsAt: open || upcoming ? '2027-03-05T17:00:00.000Z' : '2026-11-07T17:00:00.000Z',
        claimDeadlineAt: open || upcoming ? '2027-04-01T00:00:00.000Z' : '2027-03-01T00:00:00.000Z',
        eligibleDates: dates, applicationFee: 6, maxPartySize: 8, maxPreferences: 3,
        rules: ['Submit one active application per account.', 'Rank distinct entry dates in order of preference.'],
      }
      lotteries.push(lottery)
      if (upcoming) continue
      const actorId = open && index !== 0 ? 'acct-visitor' : account.id
      const status = open ? 'submitted' : pineAward || index === 3 ? 'selected' : index === 4 ? 'claimed' : 'unsuccessful'
      const app = {
        id: pineAward ? 'app-pine-selected' : `app-${permitSlug}-${season}`,
        lotteryId: lottery.id, actorId, confirmationCode: pineAward ? 'L-PINE041' : `L-${traversal ? 'TR' : 'ES'}${10000 + index}`,
        status, preferences: dates.slice(0, 2).map((entryDate, position) => ({ rank: position + 1, entryDate })),
        partySize: 2, feeAmount: lottery.applicationFee, currency: 'USD', createdAt,
        updatedAt: open ? createdAt : lottery.resultsAt,
      }
      if (status === 'selected' || status === 'claimed') {
        app.awardedDate = dates[0]
        app.claimDeadlineAt = index === 3 ? '2026-11-14T00:00:00.000Z' : lottery.claimDeadlineAt
      }
      if (status === 'claimed') {
        app.claimedAt = '2026-11-10T14:00:00.000Z'
        app.updatedAt = app.claimedAt
        const claimed = booking(destination, permitUnits[2], {
          id: 'res-sandstone-claim', confirmationCode: 'R-SAND041', startDate: app.awardedDate,
          lotteryApplicationId: app.id, createdAt: app.claimedAt, updatedAt: app.claimedAt,
        })
        app.reservationId = claimed.id
        reservations.push(claimed)
      }
      lotteryApplications.push(app)
    }
  }
  lotteries.filter((lottery) => lottery.id !== 'lottery-high-meadow-open').slice(0, 4).forEach((lottery, index) => {
    lotteryApplications.push({
      id: `app-guest-${index + 1}`, lotteryId: lottery.id, actorId: 'acct-trail-party', confirmationCode: `L-GUEST0${index + 1}`,
      status: lottery.closesAt > createdAt && lottery.resultsAt > '2026-11-18T15:00:00.000Z' ? 'submitted' : 'unsuccessful', preferences: [{ rank: 1, entryDate: lottery.eligibleDates[0] }],
      partySize: 3, feeAmount: lottery.applicationFee, currency: 'USD', createdAt, updatedAt: lottery.resultsAt > '2026-11-18T15:00:00.000Z' ? createdAt : lottery.resultsAt,
    })
  })
  return { account: { ...account }, facilities, units, reservations, lotteries, lotteryApplications, cancellations }
}
