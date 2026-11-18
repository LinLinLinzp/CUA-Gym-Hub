import catalog from "./catalog.js";
import {
  daysFromNow,
  isoDaysAgo,
  computePrice,
  round2,
  ratingKeys,
} from "../utils/pricing.js";
const fixed = (p, n, len = 3) => `${p}_${String(n).padStart(len, "0")}`;
const photo = (n) => `/images/listings/${n}.jpg`;
const pools = {
  living: [
    "living-01",
    "living-02",
    "living-03",
    "living-05",
    "aframe-03",
    "aframe-04",
    "aframe-05",
    "aframe-06",
    "loft-02",
    "loft-03",
    "loft-04",
    "desert-06",
  ],
  bedroom: [
    "bedroom-01",
    "bedroom-02",
    "bedroom-03",
    "bedroom-04",
    "bedroom-05",
    "bedroom-06",
    "bedroom-07",
    "bedroom-08",
    "bedroom-21",
    "bedroom-22",
    "bedroom-23",
    "bedroom-24",
    "bedroom-25",
  ],
  kitchen: [
    "kitchen-01",
    "kitchen-02",
    "kitchen-04",
    "kitchen-06",
    "kitchen-07",
    "kitchen-20",
    "aframe-20",
  ],
  bathroom: ["bathroom-01", "bathroom-02", "bathroom-04", "bathroom-05"],
  outdoor: [
    "patio-01",
    "patio-02",
    "patio-04",
    "patio-06",
    "patio-20",
    "pool-01",
    "spa-01",
    "lake-03",
    "treehouse-20",
    "beach-ext-06",
  ],
};
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const colors = [
  "#222222",
  "#484848",
  "#6A6A6A",
  "#008489",
  "#A61D55",
  "#D93900",
  "#C13515",
  "#428BFF",
  "#460479",
  "#00A699",
];
const amenityGroups = {
  essentials:
    "wifi kitchen washer dryer air_conditioning heating dedicated_workspace tv hair_dryer iron",
  features:
    "pool hot_tub free_parking ev_charger crib king_bed gym bbq_grill breakfast indoor_fireplace smoking_allowed sauna fire_pit",
  location: "beachfront waterfront ski_in_out lake_access",
  safety: "smoke_alarm carbon_monoxide_alarm first_aid_kit fire_extinguisher",
};
const labels = {
  wifi: "Wifi",
  tv: "TV",
  bbq_grill: "BBQ grill",
  ev_charger: "EV charger",
  free_parking: "Free parking on premises",
  ski_in_out: "Ski-in/ski-out",
};
const reviewBank = [
  "Our stay in {city} was wonderful. {host} made us feel welcome from the moment we arrived.",
  "The {feature} was the highlight of our trip. We made the most of it every evening.",
  "Spotless, cozy and exactly as described. We would happily stay again.",
  "Great location for exploring {city}; quiet at night and easy to find.",
  "The beds were comfortable and the kitchen had everything we needed for cooking together.",
  "{host} was incredibly responsive and check-in was seamless.",
  "Beautiful light in the mornings and lovely views from the windows.",
  "A peaceful place to slow down, read a book and enjoy the neighborhood.",
  "We appreciated the thoughtful little touches and the clear arrival instructions.",
  "Everything was just as pictured. Plenty of room for our family to relax.",
  "The neighborhood was walkable, with a favorite coffee shop just around the corner.",
  "We spent our days exploring and always looked forward to coming back here.",
  "The space was carefully designed, with comfortable seating and great linens.",
  "A memorable weekend away. {host} shared some excellent local recommendations.",
  "Easy parking and a convenient base for visiting the area.",
  "Our kids loved the outdoor space and we loved the quiet evenings.",
  "The {feature} made this feel like a special occasion.",
  "We cooked breakfast every morning and enjoyed the beautiful surroundings.",
  "A bright, welcoming home with everything you need for a longer visit.",
  "The photos do not capture just how peaceful this place is.",
  "Communication before and during our stay was excellent.",
  "We really appreciated the flexible arrival and detailed house guide.",
  "The location was ideal for our plans in {city}.",
  "Comfortable beds, a warm shower and a quiet night. Exactly what we needed.",
  "We felt at home right away and would recommend this place to friends.",
  "Thoughtful design, a well-equipped kitchen and an exceptionally helpful host.",
  "We loved watching the sunset after a day out exploring.",
  "A lovely place for a family reunion. Everyone had room to spread out.",
  "The home is well maintained and the welcome guide answered all our questions.",
  "We took the host’s advice and found a fantastic local restaurant.",
  "The wifi worked well for a few hours of remote work.",
  "Our dog enjoyed the walks nearby. A great base for an outdoor adventure.",
  "A charming place that feels connected to its surroundings.",
  "We will remember our slow mornings here for a long time.",
  "The house was warm and inviting even on a rainy afternoon.",
  "So much character, and the practical details were all taken care of.",
  "The check-in instructions were easy to follow after our late flight.",
  "A relaxing stay with beautiful views and a very responsive host.",
  "We especially liked the comfortable outdoor seating.",
  "Would book again for our next visit to {city}.",
];
export function createInitialData() {
  const currentUser = {
    id: "user_001",
    firstName: "Emily",
    lastName: "Carter",
    preferredName: "Emily",
    email: "emily.carter@example.com",
    phone: "+1 (415) 555-0142",
    avatarColor: "#A61D55",
    avatarUrl: null,
    location: "San Francisco, CA",
    joinedAt: "2019-03-14",
    about:
      "Product designer who loves cabins, long hikes and slow mornings. Always travelling with a good book.",
    work: "Product designer at Lumen Studio",
    languages: ["English", "Spanish"],
    school: "UC Berkeley",
    identityVerified: true,
    address: {
      street: "1458 Guerrero St",
      city: "San Francisco",
      state: "CA",
      zip: "94110",
      country: "United States",
    },
    emergencyContact: {
      name: "James Carter",
      relationship: "Brother",
      phone: "+1 (510) 555-0199",
    },
    travelCredit: 0,
  };
  const users = catalog.hosts.map((h, i) => ({
    id: h[0],
    firstName: h[1].split(" ")[0],
    lastName: h[1].split(" ").slice(1).join(" "),
    location: h[2],
    isSuperhost: h[3] === "✔",
    joinedAt: h[4],
    responseRate: Number(h[5].split("%")[0]),
    responseTimeText: h[5].split("%, ")[1] || "within a few hours",
    role: "host",
    avatarColor: colors[i % 10],
    languages:
      i === 14
        ? ["French", "English"]
        : i === 16 || i === 20
          ? ["Portuguese", "English"]
          : i === 17 || i === 21
            ? ["Spanish", "English"]
            : ["English"],
    about: `I love sharing my favorite corners of ${h[2]} with guests. ${h[6] || "Ask me about neighborhood walks, local food and a slower way to travel."}`,
    work: h[6] || "Independent business owner",
    verified: true,
    yearsHosting: new Date().getFullYear() - Number(h[4].slice(0, 4)),
  }));
  const names =
      "Ava Noah Mia Ethan Sophia Lucas Isabella Mason Harper Logan Amelia Jackson Evelyn Aiden Abigail Elijah Ella James Scarlett Benjamin Chloe Henry Grace Sebastian Lily Owen Zoe Daniel Nora Matthew Hannah Leo Aria Samuel Layla Julian Riley Gabriel Stella Wyatt".split(
        " ",
      ),
    cities = [
      "Seattle, WA",
      "Denver, CO",
      "Chicago, IL",
      "Toronto, Canada",
      "London, UK",
      "Boston, MA",
      "Portland, OR",
      "Atlanta, GA",
      "Sydney, Australia",
      "Berlin, Germany",
    ];
  names.forEach((firstName, i) =>
    users.push({
      id: fixed("user", 201 + i),
      firstName,
      role: "guest",
      avatarColor: colors[i % 10],
      location: cities[i % 10],
      joinedAt: `${2014 + (i % 10)}-05-15`,
    }),
  );
  users.push({
    id: "user_900",
    firstName: "Airbnb Support",
    role: "support",
    avatarColor: "#FF385C",
    joinedAt: "2008-08-01",
  });
  const destinations = catalog.destinations.map((d) => ({
    id: d[0],
    name: d[1],
    region: d[2],
    country: d[3],
    lat: Number(d[4].split(",")[0]),
    lng: Number(d[4].split(",")[1]),
    slug: d[5],
    blurb: d[6],
  }));
  const categories = catalog.categories.map((c) => ({
    id: c[0],
    label: c[1],
    icon: c[2],
  }));
  const amenities = Object.entries(amenityGroups).flatMap(([group, list]) =>
    list
      .split(" ")
      .map((id) => ({
        id,
        group,
        label:
          labels[id] ||
          id.replaceAll("_", " ").replace(/^./, (x) => x.toUpperCase()),
        icon:
          {
            wifi: "Wifi",
            kitchen: "CookingPot",
            pool: "Waves",
            hot_tub: "Bath",
            free_parking: "CarFront",
            tv: "Tv",
          }[id] || "CircleCheck",
      })),
  );
  const base = [
    "wifi",
    "heating",
    "hair_dryer",
    "smoke_alarm",
    "carbon_monoxide_alarm",
    "fire_extinguisher",
  ];
  const listings = catalog.catalog.map((c, i) => {
    const dest = destinations.find((d) => d.id === `dst_${c[2]}`),
      host = users.find((u) => u.id === c[1]),
      type = c[4].split(" / ")[0],
      sizes = c[6].replace(" (shared)", "").split("/").map(Number),
      extra = c[17].replace(" (luxe: true)", "").split(" "),
      n = i + 1,
      lat = dest.lat + (((i * 37) % 11) - 5) * 0.012,
      lng = dest.lng + (((i * 53) % 13) - 6) * 0.015;
    const photos = [
      c[15],
      pools.living[i % 12],
      pools.bedroom[i % 13],
      pools.kitchen[i % 7],
      pools.bathroom[i % 4],
      pools.bedroom[(i + 6) % 13],
      pools.outdoor[i % 10],
    ];
    return {
      id: c[0],
      hostId: c[1],
      destinationId: dest.id,
      title: c[5],
      propertyType: type,
      propertyTypeGroup: ["apartment", "condo", "loft", "room"].includes(type)
        ? "apartment"
        : type === "guesthouse"
          ? "guesthouse"
          : "house",
      roomType: c[4].includes("private_room") ? "private_room" : "entire_home",
      city: c[3],
      region: dest.region,
      country: dest.country,
      neighborhood: `${c[3]} neighborhood`,
      address: `${102 + i * 17} ${["Pine", "Garden", "Ridge", "Ocean", "Willow"][i % 5]} ${dest.country === "France" ? "Rue" : "Lane"}, ${c[3]}, ${dest.region}`,
      lat,
      lng,
      maxGuests: sizes[0],
      bedrooms: sizes[1],
      beds: sizes[2],
      bathrooms: sizes[3],
      sharedBath: c[6].includes("shared"),
      bedArrangement: Array.from({ length: sizes[1] || 1 }, (_, k) => ({
        room: sizes[1] ? `Bedroom ${k + 1}` : "Sleeping area",
        beds: k === 0 ? "1 king bed" : "1 queen bed",
      })),
      nightlyPrice: Number(c[7]),
      cleaningFee: Number(c[8]),
      taxRate: Number(c[9]),
      weeklyDiscountPct: n % 2 ? 10 : 0,
      monthlyDiscountPct: n % 2 ? 20 : 0,
      petFee: c[14] === "✔" ? 75 : 0,
      minNights: ["room", "tiny_home"].includes(type)
        ? 1
        : type === "house" && Number(c[7]) >= 500
          ? 3
          : 2,
      cancellationPolicy: c[10],
      nonRefundableOption: c[10] !== "flexible",
      instantBook: c[11] === "✔",
      guestFavorite: c[12] === "✔",
      selfCheckIn: c[13] === "✔",
      allowsPets: c[14] === "✔",
      luxe: c[17].includes("luxe"),
      isNew: [5, 25, 48].includes(n),
      categories: c[16].split(", "),
      amenities: [...base, ...extra],
      photos: [...new Set(photos)].map(photo),
      photoCaptions: [
        "Exterior",
        "Living room",
        "Bedroom 1",
        "Kitchen",
        "Full bathroom",
        "Bedroom 2",
        "Outdoor space",
      ],
      description: `Welcome to ${c[5]}, a thoughtfully furnished ${type.replaceAll("_", " ")} in ${c[3]}. Set in the ${dest.name} area, this home pairs beautiful ${["mountain", "garden", "neighborhood", "hillside", "sunset"][i % 5]} views with a comfortable place to unwind. Enjoy the ${extra.includes("hot_tub") ? "hot tub after a day exploring" : extra.includes("pool") ? "pool and sunny outdoor space" : "inviting living space and thoughtful local touches"}.\n\nSpend a slow morning with coffee before heading out to discover ${c[3]}'s independent shops and favorite neighborhood paths. ${host.firstName} has prepared a personal guide to the area, with tips for the best nearby meals and easy day trips. Come home to comfortable beds and a peaceful evening at your own pace.`,
      highlights: [
        {
          icon: c[13] === "✔" ? "DoorOpen" : "MapPin",
          title: c[13] === "✔" ? "Self check-in" : "Beautiful area",
          text:
            c[13] === "✔"
              ? "Check yourself in with the keypad."
              : "Guests love this home’s scenic location.",
        },
        {
          icon: extra.includes("pool")
            ? "Waves"
            : c[14] === "✔"
              ? "PawPrint"
              : "Sparkles",
          title: extra.includes("pool")
            ? "Dive right in"
            : c[14] === "✔"
              ? "Furry friends welcome"
              : "A place to unwind",
          text: extra.includes("pool")
            ? "This is one of the few places in the area with a pool."
            : "Make yourself at home and enjoy a relaxing stay.",
        },
        {
          icon: "Medal",
          title: host.isSuperhost
            ? `${host.firstName} is a Superhost`
            : "Great host communication",
          text: host.isSuperhost
            ? "Superhosts are experienced, highly rated hosts."
            : "Your host is happy to share local recommendations.",
        },
      ],
      houseRules: {
        checkInFrom: "16:00",
        checkOutBy: "10:00",
        quietHours: "22:00–07:00",
        smoking: false,
        parties: false,
        petsAllowed: c[14] === "✔",
        additional: ["No shoes inside"],
      },
      safetyNotes: [
        "Carbon monoxide alarm",
        "Smoke alarm",
        "Exterior security camera on driveway",
      ],
      languages: host.languages,
      accessibility:
        i % 4 === 0
          ? ["Step-free guest entrance", "Guest entrance wider than 32 inches"]
          : [],
      blockedRanges: [
        {
          start: daysFromNow(3 + ((i * 7) % 18)),
          end: daysFromNow(3 + ((i * 7) % 18) + 2 + (i % 3)),
        },
        {
          start: daysFromNow(i === 35 ? 60 : 28 + ((i * 5) % 20)),
          end: daysFromNow(i === 35 ? 64 : 32 + ((i * 5) % 20)),
        },
      ],
      createdAt: "2020-06-15",
    };
  });
  const reservationSpecs = [
    [17, 12, 15, 2, 0, "confirmed", 20],
    [36, 45, 51, 2, 0, "confirmed", 35],
    [6, 4, 6, 2, 0, "confirmed", 60],
    [51, 21, 25, 2, 2, "confirmed", 40],
    [11, 30, 33, 4, 0, "pending", 1],
    [46, 60, 65, 2, 0, "confirmed", 10],
    [2, -6, -3, 4, 0, "confirmed", 70],
    [31, -12, -9, 2, 0, "confirmed", 50],
    [23, -44, -40, 6, 0, "confirmed", 90],
    [12, -79, -75, 2, 0, "confirmed", 120],
    [41, -127, -120, 2, 0, "confirmed", 160],
    [56, -163, -160, 2, 0, "confirmed", 190],
    [18, -203, -200, 2, 0, "confirmed", 230],
    [27, -264, -260, 3, 0, "confirmed", 300],
    [8, 18, 21, 2, 0, "cancelled", 30],
    [33, -30, -27, 1, 0, "cancelled", 80],
    [26, 90, 97, 8, 0, "declined", 5],
  ];
  const reservations = reservationSpecs.map((r, i) => {
    const l = listings[r[0] - 1],
      guests = {
        adults: r[3],
        children: r[4],
        infants: 0,
        pets: i === 11 ? 1 : 0,
      },
      checkIn = daysFromNow(r[1]),
      checkOut = daysFromNow(r[2]),
      rateType = i === 5 ? "non_refundable" : "refundable",
      priceBreakdown = computePrice(l, checkIn, checkOut, guests, rateType);
    return {
      id: fixed("res", i + 1),
      confirmationCode: `HM${String(71234800 + i)}`,
      listingId: l.id,
      hostId: l.hostId,
      guestId: "user_001",
      checkIn,
      checkOut,
      nights: r[2] - r[1],
      guests,
      status: r[5],
      bookingType: l.instantBook ? "instant" : "request",
      rateType,
      cancellationPolicy: l.cancellationPolicy,
      priceBreakdown,
      paymentPlan: i === 1 ? "split" : "full",
      amountPaid: ["pending", "declined"].includes(r[5])
        ? 0
        : i === 1
          ? round2(priceBreakdown.total * 0.5)
          : priceBreakdown.total,
      paymentMethodId: "pm_001",
      messageToHost:
        "Looking forward to visiting! We expect to arrive around 4pm.",
      conversationId: null,
      createdAt: isoDaysAgo(r[6]),
      confirmedAt: r[5] === "pending" ? null : isoDaysAgo(r[6]),
      cancellation:
        r[5] === "cancelled"
          ? {
              cancelledBy: i === 15 ? "user_113" : "user_001",
              reason: "my_plans_changed",
              reasonText: "My travel plans changed",
              note: "",
              refundAmount: priceBreakdown.total,
              nonRefundedAmount: 0,
              refundTier: "full",
              cancelledAt: isoDaysAgo(i === 14 ? 12 : 27),
            }
          : null,
      alterations: [],
    };
  });
  const rnd = mulberry32(20261118),
    reviews = [];
  listings.forEach((l, i) => {
    if (l.isNew) return;
    const host = users.find((u) => u.id === l.hostId);
    for (let k = 0; k < 3 + (i % 6); k++) {
      let ratings = Object.fromEntries(
        ratingKeys.map((key) => {
          const x = rnd();
          return [
            key,
            l.guestFavorite
              ? x < 0.9
                ? 5
                : 4
              : x < 0.65
                ? 5
                : x < 0.93
                  ? 4
                  : 3,
          ];
        }),
      );
      let overall = Math.round(
        Object.values(ratings).reduce((a, b) => a + b, 0) / 6,
      );
      if (!l.guestFavorite && k === 0 && i % 4 === 0) {
        overall = 3;
        ratings = { ...ratings, value: 3, accuracy: 3 };
      }
      const author = users.find(
          (u) => u.id === fixed("user", 201 + ((i * 7 + k) % 40)),
        ),
        feature = l.amenities.includes("hot_tub")
          ? "hot tub"
          : l.amenities.includes("pool")
            ? "pool"
            : "outdoor space";
      const replace = (t) =>
        t
          .replaceAll("{city}", l.city)
          .replaceAll("{host}", host.firstName)
          .replaceAll("{feature}", feature);
      reviews.push({
        id: fixed("rev", reviews.length + 1, 4),
        type: "guest_to_listing",
        listingId: l.id,
        reservationId: null,
        authorId: author.id,
        subjectUserId: l.hostId,
        overall,
        ratings,
        publicText:
          overall <= 3
            ? "The photos make it look bigger than it is. Wifi was spotty during our stay, though the location was convenient."
            : replace(
                reviewBank[(i + k) % 40] +
                  " " +
                  reviewBank[(i * 3 + k + 7) % 40],
              ),
        privateNote: "",
        stayedWith: k % 3 === 0 ? "Group trip" : null,
        stayLengthText: "Stayed a few nights",
        status: "published",
        hostResponse:
          (i + k) % 5 === 0
            ? {
                text: `Thank you so much, ${author.firstName}! You’re welcome back anytime.`,
                createdAt: isoDaysAgo(5 + k * 23 + (i % 9)),
              }
            : null,
        createdAt: isoDaysAgo(7 + k * 23 + (i % 9)),
        updatedAt: null,
      });
    }
  });
  [8, 9, 10, 12, 13].forEach((index, k) => {
    const r = reservations[index];
    reviews.push({
      id: `rev_900${k + 1}`,
      type: "guest_to_listing",
      listingId: r.listingId,
      reservationId: r.id,
      authorId: "user_001",
      subjectUserId: r.hostId,
      overall: 5,
      ratings: Object.fromEntries(ratingKeys.map((x) => [x, 5])),
      publicText: `A wonderful stay in ${listings.find((l) => l.id === r.listingId).city}. The home was comfortable, thoughtfully arranged and just as described. We would love to return.`,
      privateNote: "Thanks for a lovely stay!",
      stayedWith: null,
      stayLengthText:
        r.nights >= 7 ? "Stayed about a week" : "Stayed a few nights",
      status: "published",
      hostResponse:
        k === 2
          ? {
              text: "Thank you Emily, it was a pleasure hosting you!",
              createdAt: isoDaysAgo(-reservationSpecs[index][2] - 6),
            }
          : null,
      createdAt: isoDaysAgo(-reservationSpecs[index][2] - 3),
      updatedAt: null,
    });
    reviews.push({
      id: `rev_800${k + 1}`,
      type: "host_to_guest",
      listingId: r.listingId,
      reservationId: r.id,
      authorId: r.hostId,
      subjectUserId: "user_001",
      overall: 5,
      ratings: { cleanliness: 5, communication: 5, houseRules: 5 },
      publicText:
        "Emily was a wonderful guest — clear communication and left the place spotless. Welcome back anytime!",
      status: "published",
      hostResponse: null,
      createdAt: isoDaysAgo(-reservationSpecs[index][2] - 4),
      updatedAt: null,
    });
  });
  const conversationSpec = [
    [0, 1, 1],
    [1, 3, 0],
    [2, 0, 2],
    [3, 6, 0],
    [4, 1, 0],
    [5, 9, 0],
    [6, 3, 1],
    [7, 9, 0],
    [8, 39, 0],
    [14, 12, 0],
    [null, 4, 0],
    [15, 27, 0],
    [16, 4, 0],
    [10, 119, 0],
  ];
  const conversations = conversationSpec.map(([ri, ago, unread], i) => {
    const r = ri === null ? null : reservations[ri],
      id = fixed("conv", i + 1);
    if (r) r.conversationId = id;
    return {
      id,
      type: i === 10 ? "inquiry" : i === 11 ? "support" : "reservation",
      listingId: i === 10 ? "lst_057" : r?.listingId,
      reservationId: r?.id || null,
      participantIds: [
        "user_001",
        i === 11 ? "user_900" : i === 10 ? "user_120" : r.hostId,
      ],
      hostId: i === 11 ? "user_900" : i === 10 ? "user_120" : r.hostId,
      lastMessageAt: isoDaysAgo(ago, 18, 22),
      unreadCount: unread,
      starred: i === 0,
      archived: i === 13,
      createdAt: r?.createdAt || isoDaysAgo(ago + 10),
    };
  });
  const messages = [];
  conversations.forEach((c, i) => {
    const host = users.find((u) => u.id === c.hostId);
    let bodies = [
      [
        "system",
        i === 4
          ? `Request sent · ${host?.firstName || "Your host"} has 24 hours to respond`
          : i === 12
            ? "Request declined"
            : "Reservation confirmed",
      ],
      [
        "user_001",
        i === 10
          ? "Is the farmhouse OK for a 60-lb dog?"
          : "Hi! We’re excited for our visit. We plan to arrive around 4pm.",
      ],
      [
        c.hostId,
        `Hi Emily! Thanks for choosing our home. ${host.firstName} here — happy to help with your plans.`,
      ],
      ["user_001", "Thank you! Do you have any local recommendations?"],
      [
        c.hostId,
        "Try the neighborhood bakery and the walking trail nearby. Both are favorites of ours.",
      ],
    ];
    if ([1, 3, 5, 8].includes(i)) {
      bodies.push(["user_001", "Is there anything we should bring for our stay?"]);
      if (i !== 8) bodies.push([c.hostId, "We provide fresh linens, towels and kitchen essentials. Just bring your personal items!"]);
    }
    if (i === 0)
      bodies.push([
        c.hostId,
        "Early check-in at 1pm works — I'll send the door code the day before.",
      ]);
    if (i === 2)
      bodies.push(
        [
          c.hostId,
          "Your gate code is 4821. Please park to the left of the boulder.",
        ],
        [c.hostId, "Heads up: bring layers, it drops to 40°F at night."],
      );
    if (i === 6)
      bodies[bodies.length - 1] = [
        c.hostId,
        "Thanks for being amazing guests! Hope to see you again.",
      ];
    if (i === 10)
      bodies = [
        ["user_001", "Is the farmhouse OK for a 60-lb dog?"],
        [
          c.hostId,
          "Absolutely — dogs welcome, there's a fenced yard. $75 pet fee.",
        ],
      ];
    if (i === 11)
      bodies = [
        [
          c.hostId,
          "We're sorry your host cancelled. A full refund has been issued, and we can help you find another place.",
        ],
        ["user_001", "Thank you for your help."],
      ];
    if (i === 9)
      bodies.push([
        "system",
        "Reservation cancelled · Full refund is on its way",
      ]);
    bodies.forEach(([senderId, body], k) =>
      messages.push({
        id: fixed("msg", messages.length + 1, 4),
        conversationId: c.id,
        senderId,
        kind: senderId === "system" ? "system" : "text",
        body,
        attachments: [],
        reactions: [],
        createdAt: isoDaysAgo(
          conversationSpec[i][1] + Math.floor((bodies.length - 1 - k) / 2),
          10 + k,
          14,
        ),
        readAt:
          senderId === c.hostId && k >= bodies.length - c.unreadCount
            ? null
            : isoDaysAgo(conversationSpec[i][1]),
        editedAt: null,
        deletedAt: null,
        translated: false,
      }),
    );
  });
  const wishlistSpec = [
    ["Beach getaways", [11, 12, 15, 27, 30, 50]],
    ["Mountain cabins", [1, 3, 17, 20, 51, 52, 56, 58]],
    ["Paris with Mom", [36, 38, 40]],
    ["Dream stays", [26, 47, 55, 19, 9]],
    ["Weekend in Austin", [21, 24]],
  ];
  const wishlists = wishlistSpec.map(([name, ids], i) => ({
    id: fixed("wl", i + 1),
    ownerId: "user_001",
    name,
    checkIn: i === 2 ? daysFromNow(45) : null,
    checkOut: i === 2 ? daysFromNow(51) : null,
    guests: { adults: i === 2 ? 2 : 0, children: 0, infants: 0, pets: 0 },
    items: ids.map((n) => ({
      listingId: fixed("lst", n),
      addedAt: isoDaysAgo(30),
      note:
        n === 52 ? "Ski trip with the Hendersons?" : n === 1 ? "Hot tub!!" : "",
    })),
    collaboratorIds: [],
    createdAt: isoDaysAgo(40),
    updatedAt: isoDaysAgo(3),
  }));
  const recentlyViewed = [16, 36, 6, 22, 43, 59, 31, 2, 47, 54].map((n, i) => ({
    listingId: fixed("lst", n),
    viewedAt: isoDaysAgo(Math.floor((i * 2) / 3), 9),
  }));
  const searchHistory = ["tahoe", "paris", "joshua", "asheville"].map(
    (id, i) => {
      const d = destinations.find((d) => d.id === `dst_${id}`);
      return {
        id: fixed("srch", i + 1),
        query: d.name,
        destinationId: d.id,
        checkIn: i === 2 ? null : daysFromNow(i === 1 ? 45 : 12),
        checkOut: i === 2 ? null : daysFromNow(i === 1 ? 51 : 15),
        flexible: i === 2 ? { length: "weekend", months: [] } : null,
        guests: { adults: 2, children: 0, infants: 0, pets: 0 },
        filters: {},
        resultCount: 5,
        createdAt: isoDaysAgo([2, 36, 61, 21][i]),
      };
    },
  );
  const paymentMethods = [
    {
      id: "pm_001",
      type: "card",
      brand: "Visa",
      last4: "4242",
      expMonth: 8,
      expYear: 2028,
      holderName: "Emily Carter",
      billingZip: "94110",
      isDefault: true,
      createdAt: isoDaysAgo(700),
    },
    {
      id: "pm_002",
      type: "card",
      brand: "Mastercard",
      last4: "5454",
      expMonth: 3,
      expYear: 2027,
      holderName: "Emily Carter",
      billingZip: "94110",
      isDefault: false,
      createdAt: isoDaysAgo(400),
    },
    {
      id: "pm_003",
      type: "paypal",
      email: currentUser.email,
      isDefault: false,
      createdAt: isoDaysAgo(200),
    },
  ];
  const notifications = [
    [
      "review_reminder",
      "Leave a review for Michael’s place",
      "You have 11 days left to review your Lake Tahoe stay.",
      "/reviews/write/res_007",
    ],
    [
      "review_reminder",
      "Leave a review for David’s place",
      "You have 5 days left to share your experience.",
      "/reviews/write/res_008",
    ],
    [
      "message",
      "New message from Daniel",
      "Your check-in instructions are ready.",
      "/messages/conv_003",
    ],
    [
      "booking",
      "Your reservation is confirmed",
      "Your Asheville adventure is coming up.",
      "/trips/res_001",
    ],
    [
      "booking",
      "Your request was sent",
      "Kai has 24 hours to respond.",
      "/trips/res_005",
    ],
    [
      "booking",
      "Your request was declined",
      "Find another home for your trip.",
      "/trips/res_017",
    ],
    [
      "wishlist",
      "Prices dropped for 2 homes in Paris with Mom",
      "Take another look at your saved homes.",
      "/wishlists/wl_003",
    ],
    [
      "account",
      "Your account is verified",
      "You’re ready to explore.",
      "/account-settings",
    ],
  ].map((n, i) => ({
    id: fixed("ntf", i + 1),
    type: n[0],
    title: n[1],
    body: n[2],
    link: n[3],
    read: i > 2,
    createdAt: isoDaysAgo(i + 1),
  }));
  const expTitles = [
      "Sunrise Kayak on Lake Tahoe",
      "Desert Stargazing with an Astronomer",
      "Malibu Surf Lesson",
      "Blue Ridge Waterfall Hike",
      "Austin BBQ & Food Truck Crawl",
      "Wynwood Street Art Walk",
      "Brooklyn Rooftop Photo Walk",
      "Paris Pastry Class",
      "Lisbon Tile Painting Workshop",
      "Cenote Swim & Snorkel Tulum",
      "Banff Snowshoe Adventure",
      "Catskills Forest Bathing",
    ],
    expPhotos = [
      "lake-03",
      "desert-05",
      "beach-ext-02",
      "treehouse-02",
      "kitchen-20",
      "loft-02",
      "loft-03",
      "kitchen-02",
      "patio-06",
      "spa-01",
      "cabin-ext-04",
      "tiny-02",
    ];
  const experiences = expTitles.map((title, i) => ({
    id: fixed("exp", i + 1),
    title,
    hostId: listings[i * 5].hostId,
    destinationId: destinations[i].id,
    city: destinations[i].name,
    pricePerGuest: 95 + i * 7,
    durationHours: 2.5,
    maxGroup: 8,
    rating: 4.97 - i * 0.01,
    reviewCount: 212 - i * 7,
    photo: photo(expPhotos[i]),
    languages: ["English"],
    includes: ["All equipment", "Local expert guide", "Refreshments"],
    description: `Discover ${destinations[i].name} through ${title.toLowerCase()}. Join a knowledgeable local for a small-group experience, with time for questions and a few special stops along the way.`,
    slots: Array.from({ length: 4 }, (_, k) => ({
      id: fixed("slot", i * 4 + k + 1),
      date: daysFromNow(i === 7 ? 46 + k : 3 + k * 7),
      time: "10:00",
      spotsLeft: 5 + (k % 3),
    })),
  }));
  const services = [
    "Private chef dinner",
    "In-home massage",
    "Vacation photo shoot",
    "Personal training",
    "Hair & makeup",
    "Prepared meals",
    "Catering",
    "Nails",
  ].map((title, i) => ({
    id: fixed("svc", i + 1),
    title,
    providerName: [
      "Sofia",
      "Alex",
      "Camille",
      "Jordan",
      "Priya",
      "Mateus",
      "Grace",
      "Chloe",
    ][i],
    city: "San Francisco",
    priceFrom: 125 + i * 25,
    unit: i === 0 ? "per guest" : "per session",
    photo: photo(
      [
        "kitchen-01",
        "spa-01",
        "beach-ext-03",
        "living-03",
        "bathroom-02",
        "kitchen-04",
        "patio-20",
        "bathroom-01",
      ][i],
    ),
    description: `Make your time away special with ${title.toLowerCase()}, tailored to your plans by an experienced local professional.`,
    slots: Array.from({ length: 4 }, (_, k) => ({
      id: `svcslot_${i}_${k}`,
      date: daysFromNow(4 + k * 3),
      time: "14:00",
      spotsLeft: 6,
    })),
  }));
  const experienceBookings = [
    {
      id: "eb_001",
      kind: "experience",
      experienceId: "exp_008",
      slotId: experiences[7].slots[0].id,
      guestId: "user_001",
      guests: 2,
      total: round2(experiences[7].pricePerGuest * 2),
      status: "confirmed",
      createdAt: isoDaysAgo(30),
    },
  ];
  const preferences = {
    currency: "USD",
    language: "en-US",
    timeZone: "America/Los_Angeles",
    displayTotalBeforeTaxes: false,
    translateAutomatically: true,
    notifications: {
      messagesEmail: true,
      messagesPush: true,
      remindersEmail: true,
      remindersSms: false,
      promotionsEmail: false,
      travelTipsEmail: true,
    },
    wishlistDefaultId: null,
  };
  return {
    currentUser,
    users,
    destinations,
    categories,
    amenities,
    listings,
    reviews,
    reservations,
    conversations,
    messages,
    wishlists,
    recentlyViewed,
    searchHistory,
    paymentMethods,
    notifications,
    experiences,
    services,
    experienceBookings,
    reports: [],
    preferences,
  };
}
