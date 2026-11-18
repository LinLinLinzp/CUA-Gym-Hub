const fixed = '2026-11-01T15:00:00.000Z'
const seedAudit = { createdAt: fixed, createdBy: 'mgr-01' }
const publishAudit = { ...seedAudit, publicationStatus: 'published', publishedAt: fixed, publishedBy: 'mgr-01' }
const id = (prefix, index) => prefix + '-' + String(index + 1).padStart(2, '0')

const catalog = [
  ['Dinner', [
    ['From the Hearth', 'Charred Broccolini', 'Wood-Fired Carrots', 'Ember Roasted Cauliflower', 'Cast Iron Mushrooms', 'Coal Roasted Squash', 'Grilled Asparagus'],
    ['Supper Plates', 'Maple Glazed Salmon', 'Cider Braised Pork', 'Rosemary Half Chicken', 'Red Wine Short Rib', 'Wild Mushroom Risotto', 'Seared Hanger Steak'],
    ['To Share', 'Whipped Ricotta', 'Smoked Trout Dip', 'Warm Sourdough', 'Marinated Olives', 'Crispy Chickpeas', 'Juniper Board'],
  ]],
  ['Brunch', [
    ['Eggs & More', 'Green Shakshuka', 'Soft Scramble Toast', 'Smoked Salmon Benedict', 'Garden Frittata', 'Breakfast Hash', 'Fried Egg Sandwich'],
    ['From the Griddle', 'Ricotta Pancakes', 'Brown Butter Waffle', 'Brioche French Toast', 'Blueberry Corn Cakes', 'Apple Dutch Baby', 'Buckwheat Crêpes'],
    ['Coffee & Tea', 'House Drip', 'Flat White', 'Maple Latte', 'Breakfast Tea', 'Iced Cold Brew', 'Chamomile Tea'],
  ]],
  ['Lunch', [
    ['Sandwiches', 'Roasted Turkey Club', 'Griddled Cheese', 'Braised Beef Melt', 'Herbed Chicken Roll', 'Garden Sandwich', 'Fried Fish Bun'],
    ['Soups & Salads', 'Tomato Fennel Soup', 'Little Gem Caesar', 'Roasted Beet Salad', 'Chicken Noodle Soup', 'Harvest Grain Bowl', 'Citrus Kale Salad'],
    ['Sides', 'Rosemary Fries', 'House Slaw', 'Pickled Vegetables', 'Butter Lettuce', 'Old Bay Chips', 'Cup of Fruit'],
  ]],
  ['Bar', [
    ['House Cocktails', 'Rye Old Fashioned', 'Juniper Collins', 'Pear Sidecar', 'Maple Sour', 'Garden Gimlet', 'Blood Orange Spritz'],
    ['Zero Proof', 'Ginger Lime Fizz', 'Hibiscus Cooler', 'Spiced Apple Soda', 'Cucumber Tonic', 'Grapefruit Shrub', 'Honey Lemonade'],
    ['Sweets', 'Salted Chocolate Tart', 'Vanilla Bean Custard', 'Apple Rye Crumble', 'Lemon Olive Oil Cake', 'Buttermilk Panna Cotta', 'Bourbon Pecan Pie'],
  ]],
]

const names = [
  'Avery Ellis', 'Devin Hart', 'Nina Brooks', 'Leo Park', 'Priya Shah', 'Jules Rivera', 'Tessa Boyd',
  'Noah Kim', 'Lena Ortiz', 'Amir Reed', 'Iris Morgan', 'Eli Ramos', 'Mina Frost', 'Owen Patel',
  'Rosa Diaz', 'Theo Wells', 'Skye Grant', 'Caleb Moss', 'June Lin', 'Hugo Silva', 'Ada Clarke',
  'Finn James', 'Sara Bell', 'Jamal Price', 'Rina Lowe', 'Miles Wood', 'Zoe Cruz', 'Sam Doyle',
]
const jobNames = ['Server', 'Bartender', 'Line Cook', 'Host', 'Runner', 'Prep Cook']
const serviceTypes = ['dine_in', 'takeout', 'delivery']
const reasons = ['Incorrect item', 'Guest satisfaction', 'Duplicate charge', 'Order cancellation']

export function createInitialData() {
  const account = {
    id: 'loc-01', name: 'Juniper & Rye', timeZone: 'America/New_York', currency: 'USD', taxRateBps: 875,
    actor: { id: 'mgr-01', name: 'Maya Chen', role: 'Operations manager' },
  }
  const menus = []
  const menuGroups = []
  const menuItems = []
  catalog.forEach(([name, groups], menuIndex) => {
    const menuId = id('menu', menuIndex)
    menus.push({ id: menuId, name, ...publishAudit, published: { name } })
    for (const [groupName, ...items] of groups) {
      const menuGroupId = id('grp', menuGroups.length)
      const group = { menuId, name: groupName }
      menuGroups.push({ id: menuGroupId, ...group, ...publishAudit, published: group })
      items.forEach((itemName, index) => {
        const prices = [950, 2400, 850, 1350, 1100, 375, 1450, 1200, 550, 1400, 800, 900]
        const snapshot = {
          menuGroupId, name: itemName, description: '',
          priceCents: prices[menuGroups.length - 1] + index * 75,
          availability: index === 5 && menuIndex % 2 === 0 ? 'unavailable' : 'available',
        }
        const item = { id: id('item', menuItems.length), ...snapshot, ...publishAudit, published: snapshot }
        if (menuItems.length % 19 === 3) {
          item.priceCents += 100
          item.publicationStatus = 'draft'
        }
        menuItems.push(item)
      })
    }
  })

  const menuPublications = [{
    id: 'pub-01', ...seedAudit, status: 'published', menuIds: menus.map(row => row.id),
    menuGroupIds: menuGroups.map(row => row.id), menuItemIds: menuItems.map(row => row.id),
  }]
  const orders = []
  const payments = []
  const refunds = []
  const saleItems = menuItems.filter(item => item.published.availability === 'available')
  for (let index = 0; index < 78; index++) {
    const businessDate = '2026-11-' + String(17 - Math.floor(index / 7)).padStart(2, '0')
    const createdAt = businessDate + 'T' + String(16 + index % 7) + ':15:00.000Z'
    const status = index % 11 === 0 ? 'voided' : index % 6 === 1 ? 'open' : 'paid'
    const lines = [saleItems[index % saleItems.length], saleItems[(index + 13) % saleItems.length]].map((item, lineIndex) => {
      const quantity = lineIndex === 0 ? 2 + index % 3 : 1
      const lineTotalCents = item.published.priceCents * quantity
      return {
        id: id('line', index * 2 + lineIndex), menuItemId: item.id, name: item.name, quantity,
        unitPriceCents: item.published.priceCents, lineTotalCents, taxCents: Math.round(lineTotalCents * 0.0875),
      }
    })
    const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0)
    const taxCents = lines.reduce((sum, line) => sum + line.taxCents, 0)
    const tipCents = status === 'paid' && index % 3 === 0 ? 500 : 0
    const order = {
      id: id('ord', index), checkId: id('chk', index), checkNumber: String(1125 - index), businessDate,
      guestName: names[index % names.length], tableLabel: index % 3 === 0 ? 'Table ' + (index % 14 + 1) : '',
      serviceType: serviceTypes[index % 3], status, lines, subtotalCents, taxCents, tipCents,
      totalCents: subtotalCents + taxCents + tipCents, refundStatus: 'none', refundedAmountCents: 0,
      ...seedAudit, createdAt,
    }
    if (status === 'voided') order.voidReason = 'Guest changed order'
    orders.push(order)
    if (status !== 'paid') continue
    const method = index % 7 === 0 ? 'cash' : index % 2 ? 'card' : 'gift_card'
    const payment = {
      id: id('pay', payments.length), orderId: order.id, checkId: order.checkId, method,
      ...(method === 'cash' ? {} : { last4: String(142 + index).padStart(4, '0') }),
      status: 'settled', amountCents: order.totalCents, refundStatus: 'none', refundedAmountCents: 0,
      ...seedAudit, createdAt,
    }
    payments.push(payment)
    if (index < 16 || method === 'cash' || refunds.length >= 27) continue
    const type = ['full', 'items', 'custom'][refunds.length % 3]
    const refundLines = type === 'custom' ? [] : (type === 'full' ? lines : lines.slice(0, 1)).map(line => {
      const quantity = type === 'full' ? line.quantity : 1
      const subtotalCents = Math.round(line.lineTotalCents * quantity / line.quantity)
      const taxCents = Math.round(line.taxCents * quantity / line.quantity)
      return { orderLineId: line.id, menuItemId: line.menuItemId, name: line.name, quantity, subtotalCents, taxCents, amountCents: subtotalCents + taxCents }
    })
    const refundSubtotal = type === 'custom' ? 650 : refundLines.reduce((sum, line) => sum + line.subtotalCents, 0)
    const refundTax = refundLines.reduce((sum, line) => sum + line.taxCents, 0)
    const refundTip = type === 'full' ? tipCents : 0
    const amountCents = refundSubtotal + refundTax + refundTip
    const summary = { refundStatus: type === 'full' ? 'full' : 'partial', refundedAmountCents: amountCents }
    const refundedAt = businessDate + 'T23:30:00.000Z'
    refunds.push({
      id: id('ref', refunds.length), orderId: order.id, checkId: order.checkId, paymentId: payment.id,
      type, lines: refundLines, subtotalCents: refundSubtotal, taxCents: refundTax, tipCents: refundTip,
      amountCents, reason: reasons[refunds.length % reasons.length], status: 'completed', ...seedAudit, createdAt: refundedAt,
    })
    Object.assign(order, summary, { updatedAt: refundedAt, updatedBy: 'mgr-01' })
    Object.assign(payment, summary, { updatedAt: refundedAt, updatedBy: 'mgr-01' })
  }

  const jobs = jobNames.map((name, index) => ({ id: id('job', index), name }))
  const employees = names.map((name, index) => ({
    id: id('emp', index), name, jobIds: [jobs[index % jobs.length].id, jobs[(index + 1) % jobs.length].id], status: 'active',
  }))
  const timeEntries = []
  const timeEntryChanges = []
  for (let index = 0; index < 70; index++) {
    const employee = employees[index % employees.length]
    const day = 16 - Math.floor(index / employees.length) * 2
    const businessDate = '2026-11-' + day
    const clockIn = businessDate + (index % 7 === 0 ? 'T23:00:00.000Z' : 'T15:00:00.000Z')
    const open = index < 8
    const clockOut = open ? null : new Date(Date.parse(clockIn) + 8 * 3600000).toISOString()
    const breakMinutes = index % 3 === 0 ? 30 : 0
    const snapshot = {
      employeeId: employee.id, jobId: employee.jobIds[0], businessDate, clockIn, clockOut,
      breakMinutes, workedMinutes: open ? null : 480 - breakMinutes,
      cashTipsCents: index % 3 === 0 ? 2400 : 0, status: open ? 'open' : 'closed',
    }
    const timeEntryId = id('te', index)
    timeEntries.push({ id: timeEntryId, ...snapshot, ...seedAudit, createdAt: clockIn })
    if (index % 9 === 0 && !open) {
      const updatedAt = new Date(Date.parse(clockOut) + 3600000).toISOString()
      Object.assign(timeEntries.at(-1), { updatedAt, updatedBy: 'mgr-01' })
      timeEntryChanges.push({
        id: id('tec', timeEntryChanges.length), timeEntryId, changeType: 'corrected', reason: 'Missed clock-out',
        before: { ...snapshot, clockOut: null, workedMinutes: null, status: 'open' },
        after: snapshot, ...seedAudit, createdAt: updatedAt,
      })
    }
  }

  return { account, menus, menuGroups, menuItems, menuPublications, employees, jobs, orders, payments, timeEntries, timeEntryChanges, refunds }
}

