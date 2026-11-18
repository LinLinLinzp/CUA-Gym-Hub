import { essayParagraphs } from "./essays.js";
import { storyDetails } from "./storyDetails.js";
import { storyMetrics } from "../utils/storyMetrics.js";
const date = "2026-11-10T12:00:00.000Z";
const colors = [
  "#E8D5B7",
  "#B5C9C3",
  "#C9B8D8",
  "#F2C6B4",
  "#A9C6E8",
  "#D8E2B6",
  "#E3B5B5",
  "#BFD7EA",
  "#F0DDA8",
  "#C7C7C7",
];
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const names = [
  "Medium Staff",
  "Jordan Ellis",
  "Priya Raman",
  "Tomás Herrera",
  "Hannah Okafor",
  "Kenji Watanabe",
  "Leila Haddad",
  "Sam Whitaker",
  "Ana Sofía Ruiz",
  "Dmitri Volkov",
  "Grace Liu",
  "Owen Price",
  "Nadia Rahman",
  "Eleanor Brooks",
  "Marcus Bell",
  "Sofia Andersson",
  "Ethan Cole",
  "Amara Diallo",
  "Oliver Chen",
  "Fatima Aziz",
  "Noah Williams",
  "Isabel Costa",
  "Theo Martin",
  "Yuki Sato",
  "Clara Jensen",
  "Rafael Santos",
  "Zoe Mitchell",
  "Arjun Mehta",
  "Alice Grant",
  "Louis Moreau",
  "Mina Park",
];
const bios = [
  "Official account of Medium’s editorial team.",
  "Film critic. Thinking about what happens between the frames.",
  "Literary translator. Between languages, there is always another story.",
  "Music, memory, and the records that keep us company.",
  "Art historian. Museums belong to everyone.",
  "Kyoto food, travel, and the pleasures of getting lost.",
  "Essays on grief, family, and starting over.",
  "History lives in the footnotes.",
  "Poetry for ordinary mornings.",
  "Chess, philosophy, and the lives of ideas.",
  "Designing a more thoughtful everyday.",
  "Making room for work that matters.",
  "Artificial intelligence, human culture.",
];
const topicNames = [
  "Books",
  "Reading",
  "Literature",
  "Fiction",
  "Poetry",
  "Writing",
  "Writing Tips",
  "Essay",
  "Film",
  "Movies",
  "Television",
  "Music",
  "Art",
  "Photography",
  "Design",
  "Architecture",
  "History",
  "Philosophy",
  "Culture",
  "Food",
  "Travel",
  "Japan",
  "Museums",
  "Self Improvement",
  "Productivity",
  "Psychology",
  "Relationships",
  "Life Lessons",
  "Mental Health",
  "Technology",
  "Artificial Intelligence",
  "Programming",
  "Data Science",
  "Startup",
  "Science",
  "Climate Change",
];
const pubNames = [
  "Slow Culture",
  "Counter Arts",
  "The Writing Cooperative",
  "Lessons from History",
  "Human Parts",
  "Electric Literature",
  "Age of Awareness",
  "The Startup",
  "Fourth Wave",
  "Bouncin' and Behavin' Blogs",
];
const pubIds = [
  "slow_culture",
  "counter_arts",
  "writing_cooperative",
  "lessons_history",
  "human_parts",
  "electric_literature",
  "age_awareness",
  "startup",
  "fourth_wave",
  "bouncin",
];
const titles = [
  "The Quiet Art of Rereading",
  "What Tarkovsky Knew About Waiting",
  "I Translated a Novel Nobody Asked For",
  "The Last Record Store in Gothenburg",
  "Kyoto in the Rain: A Tofu Pilgrimage",
  "Why Museums Should Let You Touch Things",
  "The Footnote That Started a War",
  "A Small Atlas of Unfinished Things",
  "What We Lose When We Stop Writing Letters",
  "The Library at the End of the Tram Line",
  "A City Is Made of Its Bookshops",
  "Listening to Nina Simone on a Sunday",
  "In Praise of the Unphotographed Holiday",
  "The Secret Life of a Painting’s Frame",
  "How to Read a Poem Without Solving It",
  "The Architecture of a Good Conversation",
  "There Is No Shortcut Through a Difficult Book",
  "My Grandmother’s Recipes Were Never Written Down",
  "A Photographer Learns to Put the Camera Away",
  "What an Empty Cinema Can Teach Us",
  "The Beautiful Inefficiency of Learning a Language",
  "The Case for Keeping Your Old Notebooks",
  "On Reading the Same Book at Different Ages",
  "The Japanese Word I Couldn’t Translate",
  "When the Museum Changed Its Mind",
  "A Brief History of Getting Lost",
  "The Films We Inherit From Our Parents",
  "A Record Collector’s Guide to Letting Go",
  "How a Garden Became a Public Library",
  "The Unexpected Politics of a Park Bench",
  "What We Mean When We Say Home",
  "An Afternoon With the Last Mapmaker",
  "The Novel That Taught Me to Pay Attention",
  "Why I Still Buy Newspapers",
  "The Art of the Long Walk",
  "A Letter to the Friend Who Stopped Reading",
  "The Stories We Tell About Our Cities",
  "A Different Kind of Writing Practice",
  "The Music Between the Notes",
  "Reading Slowly in a Fast World",
  "The Quiet Art of Rereading",
  "A Film Is a Place You Can Return To",
  "An Education in Paying Attention",
  "The Books We Leave Behind",
  "The Weight of an Ordinary Tuesday",
  "Notes From a Northern Winter",
  "What Makes an Essay Stay With You",
  "A Room Without Notifications",
  "On Not Finishing Every Book",
  "The Public Life of a Private Diary",
  "The Forgotten Women Who Built Modern Design",
  "A Sunday Morning in Lisbon",
  "Writing Around the Silence",
  "What Translation Gives Back",
  "The Bookshop That Opened During a Storm",
  "Why Every City Needs a Small Cinema",
  "Learning to Cook From Marginal Notes",
  "The Patient Work of Restoration",
  "An Archive of Everyday Sounds",
  "How to Begin Again at Forty",
  "Making Peace With an Unfinished Draft",
  "The Last Handwritten Menu",
  "What Children Notice in Galleries",
  "A Philosophy of Taking the Slow Train",
  "The Colour of a City at Dusk",
  "Before the Algorithm, There Was the Mixtape",
  "The Quiet Politics of Sharing Food",
  "Where Old Photographs Go",
  "A Walk Through the History of Tea",
  "In Defence of the Amateur",
  "A Translator’s Notebook From Berlin",
  "When a Building Becomes a Memory",
  "The Story Hidden in a Shopping List",
  "A Reader’s Guide to Changing Your Mind",
  "How Poetry Survived the Group Chat",
  "The Smallest Museum in Sweden",
  "When We Learned to Listen Again",
  "The Future Needs More Librarians",
  "A Year of Looking at One Painting",
  "Technology Has a Memory Problem",
  "Why We Need Better Stories About Climate",
  "The Books Nobody Borrows",
  "A Letter From the Edge of Summer",
  "The Joy of Knowing Less",
];
export function createInitialData() {
  const users = [
    {
      id: "u_maya",
      username: "mayalindqvist",
      name: "Maya Lindqvist",
      pronouns: "she/her",
      bio: "Essays on books, film, and the art of paying attention. Editor of Slow Culture.",
      about:
        "I’m a writer and editor based in Stockholm. I write about the books, films, and ordinary moments that make us pay attention.\n\nSlow Culture is a home for essays that take their time. When I’m not reading, you can find me in a secondhand bookshop or at the cinema.",
      avatarColor: colors[0],
      followerCount: 2417,
      followingCount: 186,
      isMember: true,
      isPartner: true,
      emailSubscriberCount: 312,
      joinedAt: "2019-03-14T10:00:00.000Z",
      location: "Stockholm, Sweden",
    },
    ...names.map((name, i) => ({
      id: `u_${String(i + 1).padStart(3, "0")}`,
      username: slug(name).replaceAll("-", ""),
      name,
      bio:
        bios[i] ||
        `Writing about ${topicNames[i].toLowerCase()}, culture, and the things we tend to overlook.`,
      about: `${bios[i] || "Stories from a life spent noticing."}\n\nI write to understand the world a little better, and to share what I find along the way.`,
      avatarColor: colors[(i + 1) % 10],
      followerCount: i === 0 ? 186000 : 40 + i * 1733,
      followingCount: 35 + i * 7,
      isMember: true,
      isPartner: i % 3 === 0,
      emailSubscriberCount: 100 + i * 11,
      joinedAt: "2020-03-14T10:00:00.000Z",
    })),
  ];
  users[1].username = "medium-staff";
  const topics = topicNames.map((name, i) => ({
    id: "t_" + slug(name).replaceAll("-", "_"),
    slug: slug(name),
    name,
    storyCount: 412000 - i * 8900,
    writerCount: 98000 - i * 2100,
    followerCount: 1200000 - i * 27000,
    relatedTopicIds: [],
  }));
  topics.forEach(
    (t, i) =>
      (t.relatedTopicIds = [topics[(i + 1) % 36].id, topics[(i + 2) % 36].id]),
  );
  const publications = pubNames.map((name, i) => ({
    id: "pub_" + pubIds[i],
    slug: slug(name),
    name,
    tagline: [
      "Essays for people who still read to the end.",
      "Art is a conversation. Join in.",
      "A community of people helping each other write better.",
      "The past is never quite finished with us.",
      "Real stories about being human.",
      "Expanding the power of literature.",
      "Stories for a more thoughtful world.",
      "Get smarter at building things.",
      "Culture, power, and a different perspective.",
      "A space for curious voices.",
    ][i],
    description: [
      "Slow Culture publishes essays about the books, films, and everyday encounters that reward a second look. We welcome patient criticism and writing rooted in a particular place.",
      "Counter Arts makes room for disagreement about art. Read exhibition reviews, conversations with working artists, and arguments about who gets to shape our cultural institutions.",
      "Writers learn from other writers. The Writing Cooperative shares practical lessons in drafting, editing, pitching, and sustaining a creative practice alongside ordinary life.",
      "Letters, archives, and overlooked lives complicate the stories we tell about the past. Lessons from History pairs close research with accessible historical essays.",
      "Human Parts is a home for personal accounts of family, friendship, grief, and change. We publish voices willing to stay with the difficult details of being human.",
      "Electric Literature connects readers with new fiction, poetry, and the people who make it. Explore conversations about translation, independent publishing, and the books outside the spotlight.",
      "Age of Awareness examines how we learn and live together. Our writers connect education, mental health, social responsibility, and the practical work of building stronger communities.",
      "The Startup follows the people behind new ventures: their experiments, decisions, and lessons learned. Find grounded accounts of product development, technology, and working independently.",
      "Fourth Wave publishes feminist perspectives on culture, work, and power. Essays and criticism ask whose experiences get heard and what a more equal public life could look like.",
      "Bouncin’ and Behavin’ Blogs brings together personal essays, playful observations, and curious detours. We value a distinctive voice and a good story over a tidy moral.",
    ][i],
    logoColor: colors[(i + 1) % 10],
    headerStyle: i === 3 ? "dark" : "light",
    accentColor: "#1F3A5F",
    ownerId: i === 0 ? "u_maya" : users[i + 2].id,
    editorIds:
      i === 0
        ? ["u_maya", "u_007"]
        : i === 9
          ? [users[i + 2].id, "u_maya"]
          : [users[i + 2].id],
    writerIds:
      i === 0
        ? ["u_003", "u_011", "u_014", "u_019", "u_022"]
        : i === 1 || i === 2
          ? ["u_maya", users[i + 3].id]
          : [users[i + 4].id],
    topicIds: topics.slice(i, i + 3).map((t) => t.id),
    navItems: topics.slice(i, i + 3).map((t, j) => ({
      id: "nav_" + j,
      label: t.name.toUpperCase(),
      topicId: t.id,
    })),
    featuredStoryIds: [],
    submissionPolicy:
      i === 8 ? "closed" : i === 1 || i === 2 ? "writers_only" : "open",
    submissionGuidelines:
      "We welcome original essays of 1,200–4,000 words. Please include a clear point of view, credit your sources, and tell us why this story matters to you.",
    followerCount: i === 0 ? 18432 : 1200 + i * 91000,
    email: `editors@${slug(name)}.pub`,
    twitter: slug(name).replaceAll("-", ""),
    createdAt: "2021-06-02T09:00:00.000Z",
    updatedAt: date,
  }));
  const stories = Array.from({ length: 84 }, (_, i) => {
    const n = i + 1,
      id = "st_" + String(n).padStart(4, "0"),
      mine = n <= 8 || (n >= 40 && n <= 49),
      draft = n <= 7 || n >= 79,
      pub = mine
        ? n === 4
          ? publications[1]
          : n === 5
            ? publications[2]
            : n >= 40 && n <= 42
              ? publications[0]
              : n === 43
                ? publications[1]
                : null
        : n >= 79
          ? publications[0]
          : i % 4 === 0
            ? null
            : publications[i % 10];
    const title = n === 1 ? "" : titles[i],
      body =
        n === 2
          ? []
          : essayParagraphs(titles[i], storyDetails[i][1])
              .slice(0, n <= 20 || (n >= 40 && n <= 49) ? 5 : 3)
              .map((text, j) => ({
                id: id + "_b" + j,
                type: "p",
                text,
                html: text,
              }));
    if (n !== 2 && (n <= 20 || (n >= 40 && n <= 49)))
      body.splice(
        1,
        0,
        { id: id + "_h", type: "h3", text: "Learning to pay attention" },
        {
          id: id + "_img",
          type: "image",
          src: "cover:" + id + ":2",
          caption: "A study in light, memory, and returning.",
        },
        {
          id: id + "_q",
          type: "blockquote",
          text: "We do not remember days. We remember moments.",
        },
        {
          id: id + "_ul",
          type: "ul",
          items: [
            "Leave room for curiosity.",
            "Return to what matters.",
            "Notice what changes.",
          ],
        },
      );
    const publishedAt =
      draft || n === 8
        ? null
        : `2026-${String(7 + (i % 5)).padStart(2, "0")}-${String(1 + (i % 17)).padStart(2, "0")}T10:00:00.000Z`;
    return {
      id,
      slug: slug(title),
      authorId: mine
        ? "u_maya"
        : n >= 79
          ? publications[0].writerIds[(n - 79) % 5]
          : users[2 + (i % 30)].id,
      publicationId: pub?.id || null,
      title,
      subtitle: storyDetails[i][0],
      body,
      coverImage: n <= 3 ? null : "cover:" + id + ":1",
      topicIds: [
        ...new Set([topics[i % 23].id, topics[(i + 1) % 23].id, "t_culture"]),
      ],
      status: n === 8 ? "scheduled" : draft ? "draft" : "published",
      visibility: n === 48 || n === 49 ? "unlisted" : "public",
      memberOnly: mine ? [41, 43, 46].includes(n) : i % 5 < 2,
      allowResponses: true,
      license: "all_rights_reserved",
      seoTitle: "",
      seoDescription: "",
      canonicalUrl: "",
      previewTitle: null,
      previewSubtitle: null,
      previewImage: null,
      emailSubscribers: true,
      pinnedToProfile: n === 41,
      ...storyMetrics(body),
      clapCount: draft ? 0 : 3 + i * 53,
      viewCount: 500 + i * 211,
      readCount: 100 + i * 81,
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: date,
      publishedAt,
      scheduledFor: n === 8 ? "2026-12-01T15:00:00.000Z" : null,
      lastPublishedVersion: null,
    };
  });
  publications.forEach(
    (p) =>
      (p.featuredStoryIds = stories
        .filter((s) => s.publicationId === p.id && s.status === "published")
        .slice(0, 3)
        .map((s) => s.id)),
  );
  const published = stories.filter(
    (s) => s.status === "published" && s.visibility === "public",
  );
  const listNames = [
    "Reading list",
    "Essays I keep rereading",
    "Film criticism worth your time",
    "On the craft of writing",
    "Kyoto, slowly",
    "Staff Picks",
    "Best of Electric Literature 2026",
    "Music writing that made me listen again",
    "History’s strangest footnotes",
    "A home for poetry",
    "Design that makes a difference",
    "The long way home",
    "Books for changing seasons",
    "Ways of seeing",
  ];
  const lists = listNames.map((name, i) => ({
    id:
      i === 0
        ? "lst_reading_maya"
        : i === 5
          ? "lst_staff_picks"
          : "lst_" + String(i).padStart(3, "0"),
    ownerId: i < 5 ? "u_maya" : i === 5 ? "u_001" : users[i].id,
    name,
    description:
      i === 0
        ? ""
        : `A collection of stories worth making time for. Curated with care and meant to be returned to.`,
    visibility: i === 0 || i === 4 ? "private" : "public",
    isDefault: i === 0,
    items: Array.from(
      {
        length:
          i === 0
            ? 9
            : i === 5
              ? 12
              : i === 1
                ? 7
                : i === 2
                  ? 6
                  : i === 3
                    ? 5
                    : i === 4
                      ? 4
                      : 8,
      },
      (_, j) => ({
        storyId: published[(i === 5 ? j : i * 3 + j) % published.length].id,
        note:
          i === 1 && j < 2
            ? [
                "Revisit the passage about looking twice before taking a photograph.",
                "Bring this discussion of empty cinemas to our Thursday film group.",
              ][j]
            : "",
        addedAt: date,
      }),
    ),
    clapCount: i * 17,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: date,
  }));
  const submissions = Array.from({ length: 9 }, (_, i) => ({
    id: "sub_" + String(i + 1).padStart(3, "0"),
    storyId:
      i === 0
        ? "st_0004"
        : i === 1
          ? "st_0005"
          : i === 2
            ? "st_0006"
            : i === 3
              ? "st_0043"
              : stories[78 + i - 4].id,
    publicationId:
      i === 0 || i === 3
        ? publications[1].id
        : i === 1
          ? publications[2].id
          : i === 2
            ? publications[3].id
            : publications[0].id,
    submittedById: i < 4 ? "u_maya" : stories[78 + i - 4].authorId,
    status: [
      "pending",
      "edits_requested",
      "declined",
      "approved",
      "pending",
      "pending",
      "pending",
      "pending",
      "in_review",
    ][i],
    noteToEditors:
      "An essay about how we make time for culture in an increasingly hurried world.",
    editorNote:
      i === 1
        ? "Please expand the final section with a concrete example."
        : i === 2
          ? "Thank you for sharing. This piece is outside our current focus."
          : null,
    decidedById: i === 1 || i === 2 || i === 3 ? "u_004" : null,
    decidedAt: i === 1 || i === 2 || i === 3 ? date : null,
    createdAt: date,
    updatedAt: date,
  }));
  const comments = [
    "This made me pick up a book I had left unfinished. Thank you for the reminder.",
    "There is something wonderful about giving a familiar story another chance.",
    "I found myself thinking about this on the walk home.",
    "The distinction between finishing and understanding really stayed with me.",
    "A beautiful way to describe something I have felt for years.",
    "I wonder how this changes when we read in another language.",
    "Thank you for adding this perspective. It gives me a lot to think about.",
    "Our local library started a slow-reading group last spring. We are only halfway through the first novel, and nobody seems to mind.",
    "I disagree about the value of finishing. Sometimes reaching the ending changes how I understand a difficult beginning.",
    "My mother wrote the date inside every book she bought. Her shelves became a calendar we could actually read.",
    "The scene at the kitchen table is what stayed with me. I could hear the conversation without needing another explanation.",
    "I used to work in a secondhand shop, and the notes customers left in books were often better than the reviews.",
    "Could you say more about the editor’s role here? I would love to know which parts changed between drafts.",
    "This reminds me of the cinema in my hometown. The owner still introduces the films on Friday evenings.",
    "As a translator, I recognise that moment when an accurate word produces entirely the wrong sentence.",
    "There is a similar project in Glasgow, with residents recording the sounds of streets before redevelopment.",
    "I appreciate that you leave the disagreement unresolved. The two accounts do not have to cancel each other out.",
    "The distinction between having a collection and using it is uncomfortable in the best way. My shelves need a visit.",
    "I shared this with my father. He remembered the shop, though he insists the doorbell sounded different.",
    "What happens to this kind of practice when the space becomes too expensive? That seems like the next question.",
    "I tried the exercise this morning and noticed the same delivery driver passes my window three times.",
    "The archive reference was helpful. I followed it and found another letter from the same week.",
    "A small correction: the restored version also includes a scene that was missing from the original release.",
    "I am grateful for criticism that describes what an artwork does before deciding whether it succeeds.",
    "My grandmother used a teacup for measurements too. We still use it, even though the handle broke years ago.",
    "I wonder whether the absence of photographs makes remembering easier, or just makes different memories possible.",
    "The account of the workshop changed my mind about joining one. I had imagined it would be mostly advice.",
    "I teach teenagers, and their questions about paintings are almost always more direct than the wall labels.",
    "You have described the reason I take the regional train when I have time. The stops give the journey a shape.",
    "This is an argument for funding the people who maintain things, as much as celebrating the people who begin them.",
    "There is a tension here between making art accessible and allowing it to remain difficult. I would enjoy a follow-up.",
    "The last paragraph sent me back to the opening. That detail means something quite different the second time.",
    "I keep a notebook of passages rather than a reading target. It has become a record of what I was worried about.",
    "At our community dinner, assigning the washing up made a bigger difference than any new recipe.",
    "The mention of the filing system is crucial. A catalogue can shape an argument before we open the first box.",
    "I came here through the publication and have now saved three more pieces by this writer.",
    "Have you read the correspondence published after the exhibition? It offers another account of the same decision.",
    "I am not sure the comparison works for digital collections, where keeping something does not make it easy to find.",
    "The image of the lamp facing the courtyard brought back my first winter in Stockholm.",
    "We lose something when every hobby needs a plan for becoming paid work. Thank you for defending the beginner.",
  ];
  const responses = Array.from({ length: 140 }, (_, i) => ({
    id: "rsp_" + String(i + 1).padStart(4, "0"),
    targetType: i >= 137 ? "list" : "story",
    targetId:
      i >= 137
        ? lists[1 + (i % 3)].id
        : i < 64
          ? stories[39 + Math.floor(i / 8)].id
          : published[(i - 64) % published.length].id,
    parentResponseId: i % 4 === 3 ? "rsp_" + String(i).padStart(4, "0") : null,
    authorId:
      i % 17 === 0 || i === 3 || i === 11 || i === 64
        ? "u_maya"
        : users[2 + (i % 30)].id,
    body: comments[i % comments.length],
    bodyHtml: null,
    quote: null,
    clapCount: i % 23,
    hidden: i === 2,
    hiddenById: i === 2 ? "u_maya" : null,
    edited: i === 8 || i === 19,
    deleted: false,
    createdAt: `2026-11-${String(1 + (i % 17)).padStart(2, "0")}T09:00:00.000Z`,
    updatedAt: date,
  }));
  responses.forEach((r) => {
    if (r.parentResponseId) {
      const parent = responses.find((x) => x.id === r.parentResponseId);
      if (parent) {
        r.targetId = parent.targetId;
        r.targetType = parent.targetType;
      }
    }
  });
  const activity = (prefix, n, fn) =>
    Array.from({ length: n }, (_, i) => ({
      id: prefix + "_" + String(i + 1).padStart(3, "0"),
      ...fn(i),
    }));
  return {
    currentUserId: "u_maya",
    users,
    publications,
    topics,
    stories,
    submissions,
    lists,
    responses,
    listSaves: activity("ls", 3, (i) => ({
      userId: "u_maya",
      listId: lists[6 + i].id,
      createdAt: date,
    })),
    claps: activity("clp", 30, (i) => ({
      userId: "u_maya",
      targetType: "story",
      targetId: published.filter((s) => s.authorId !== "u_maya")[i].id,
      count: i === 0 ? 50 : 1 + (i % 49),
      createdAt: date,
      updatedAt: date,
    })),
    highlights: activity("hl", 10, (i) => ({
      userId: "u_maya",
      storyId: published[i % 6].id,
      blockId: published[i % 6].body[0]?.id,
      text: published[i % 6].body[0]?.text?.slice(0, 60) || "",
      startOffset: 0,
      endOffset: 60,
      createdAt: date,
    })),
    follows: activity("fol", 40, (i) => ({
      followerId: "u_maya",
      targetType: i < 18 ? "user" : i < 26 ? "publication" : "topic",
      targetId:
        i < 18
          ? users[i + 2].id
          : i < 26
            ? publications[i - 18].id
            : topics[i - 26].id,
      createdAt: date,
    })),
    mutes: [
      {
        id: "mut_001",
        userId: "u_maya",
        targetType: "user",
        targetId: "u_029",
        createdAt: date,
      },
    ],
    notifications: activity("ntf", 30, (i) => ({
      userId: "u_maya",
      type: [
        "follow",
        "clap",
        "response",
        "reply",
        "list_add",
        "submission_received",
        "submission_approved",
        "submission_declined",
        "edits_requested",
        "publication_writer_added",
        "mention",
      ][i % 11],
      actorId: users[2 + (i % 30)].id,
      storyId: "st_0041",
      responseId: responses[i].id,
      listId: lists[1].id,
      publicationId: publications[0].id,
      submissionId: submissions[i % 9].id,
      read: i >= 9,
      createdAt: `2026-11-${String(17 - (i % 17)).padStart(2, "0")}T09:12:00.000Z`,
    })),
    readingHistory: activity("rh", 25, (i) => ({
      userId: "u_maya",
      storyId: published[i].id,
      readAt: `2026-11-${String(17 - (i % 17)).padStart(2, "0")}T21:00:00.000Z`,
    })),
    settings: {
      email: "maya.lindqvist@fastmail.com",
      allowEmailReplies: true,
      emailNotifications: {
        storyRecommendations: true,
        newFollowers: true,
        responses: true,
        claps: false,
        mentions: true,
        publicationSubmissions: true,
        newsletter: true,
      },
      pushNotifications: false,
      defaultResponseSort: "relevant",
      hideActivity: false,
      readingFont: "serif",
    },
    ui: { sidebarOpen: true, homeTab: "for-you", dismissedTips: [] },
  };
}
