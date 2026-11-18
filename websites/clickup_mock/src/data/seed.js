export function createInitialData() {
  const now = new Date(),
    today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const add = (dt, n) => {
    const x = new Date(dt);
    x.setDate(x.getDate() + n);
    return x;
  };
  const fmt = (x) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const d = (n) => fmt(add(today, n)),
    dow = (today.getDay() + 6) % 7,
    S = add(today, -dow - 7);
  const sd = (n) => fmt(add(S, n)),
    ts = (n, h = 9, m = 0) => {
      const x = add(today, n);
      x.setHours(h, m, 0, 0);
      return new Date(Math.min(+x, +now)).toISOString();
    },
    sts = (n, h = 9) => {
      const x = add(S, n);
      x.setHours(h, 0, 0, 0);
      return new Date(Math.min(+x, +now)).toISOString();
    };
  const people = [
    ["jordan", "Jordan Rivera", "Head of Product Engineering"],
    ["priya", "Priya Shah", "Senior Backend Engineer"],
    ["marcus", "Marcus Chen", "Frontend Engineer"],
    ["elena", "Elena Petrova", "Engineering Manager"],
    ["sam", "Sam Okafor", "QA Engineer"],
    ["hannah", "Hannah Kim", "Product Designer"],
    ["diego", "Diego Alvarez", "DevOps Engineer"],
    ["olivia", "Olivia Bennett", "Marketing Lead"],
    ["noah", "Noah Williams", "Content Strategist"],
    ["aisha", "Aisha Rahman", "Growth Marketer"],
    ["ben", "Ben Carter", "Operations Manager"],
    ["grace", "Grace Liu", "People Ops Partner"],
  ];
  const colors = [
    "#7B68EE",
    "#0091FF",
    "#30A46C",
    "#AB4ABA",
    "#F76B15",
    "#E93D82",
    "#12A594",
    "#E5484D",
    "#3E63DD",
    "#FFB224",
    "#8E4EC6",
    "#0D74CE",
  ];
  const users = people.map(([key, name, title], i) => ({
    id: `u_${key}`,
    name,
    title,
    initials: name
      .split(" ")
      .map((x) => x[0])
      .join(""),
    email: name.toLowerCase().replace(" ", ".") + "@lumenlabs.io",
    role:
      i === 0
        ? "owner"
        : [3, 7].includes(i)
          ? "admin"
          : i === 11
            ? "guest"
            : "member",
    color: colors[i],
    timezone: "America/New_York",
    weeklyCapacityHours: 40,
    status: i < 3 ? "online" : "offline",
  }));
  const teams = [
    {
      id: "tm_platform",
      name: "Platform Team",
      handle: "@platform",
      memberIds: [
        "u_jordan",
        "u_priya",
        "u_marcus",
        "u_elena",
        "u_sam",
        "u_diego",
      ],
    },
    {
      id: "tm_marketing",
      name: "Marketing",
      handle: "@marketing",
      memberIds: ["u_olivia", "u_noah", "u_aisha"],
    },
    {
      id: "tm_ops",
      name: "Operations",
      handle: "@ops",
      memberIds: ["u_ben", "u_grace", "u_hannah"],
    },
  ];
  const statusColors = {
    "to do": "#87909E",
    open: "#87909E",
    "in progress": "#0091FF",
    "in review": "#AB4ABA",
    review: "#F76B15",
    blocked: "#E5484D",
    waiting: "#FFB224",
    complete: "#30A46C",
    closed: "#30A46C",
  };
  const spaces = [
    [
      "eng",
      "Engineering",
      "#3E63DD",
      ["to do", "in progress", "in review", "blocked", "complete", "closed"],
    ],
    [
      "mkt",
      "Marketing",
      "#E5484D",
      ["to do", "in progress", "review", "complete", "closed"],
    ],
    [
      "design",
      "Design",
      "#12A594",
      ["to do", "in progress", "in review", "complete", "closed"],
    ],
    [
      "ops",
      "Operations",
      "#8E4EC6",
      ["open", "in progress", "waiting", "complete", "closed"],
    ],
  ].map(([key, name, color, statuses], i) => ({
    id: "sp_" + key,
    name,
    color,
    icon: name[0],
    private: false,
    memberIds: users.map((u) => u.id),
    orderIndex: i,
    createdAt: ts(-120),
    statuses: statuses.map((name, j) => ({
      id: `st_${key}_${j}`,
      name,
      color: statusColors[name],
      type:
        j === 0
          ? "open"
          : name === "complete"
            ? "done"
            : name === "closed"
              ? "closed"
              : "custom",
      orderIndex: j,
    })),
  }));
  const sprintSettings = {
    nameTemplate: "Sprint {INDEX} ({START_DATE} - {END_DATE})",
    durationDays: 14,
    startDay: "monday",
    dateFormat: "M/D",
    measureOfEffort: "sprint_points",
    nonWorkingDays: ["saturday", "sunday"],
    automations: {
      autoCreate: false,
      autoCreateCount: 2,
      autoMarkDone: true,
      moveSpilloverToNext: true,
    },
    backlogListId: "li_backlog",
  };
  const folders = [
    ["sprints", "eng", "Platform Sprints"],
    ["platform", "eng", "Platform"],
    ["campaigns", "mkt", "Campaigns"],
    ["clients", "ops", "Client Work"],
  ].map(([key, sp, name], i) => ({
    id: "fd_" + key,
    spaceId: "sp_" + sp,
    name,
    isSprintFolder: i === 0,
    orderIndex: i,
    hidden: false,
    createdAt: ts(-120),
    ...(i === 0 ? { sprintSettings } : {}),
  }));
  const lists = [
    ["backlog", "eng", "sprints", "Backlog"],
    ["api", "eng", "platform", "API & Integrations"],
    ["bugs", "eng", "platform", "Bug Tracker"],
    ["infra", "eng", null, "Infrastructure"],
    ["launch", "mkt", "campaigns", "Q4 Product Launch"],
    ["content", "mkt", "campaigns", "Content Calendar"],
    ["events", "mkt", null, "Events & Webinars"],
    ["dsys", "design", null, "Design System"],
    ["research", "design", null, "User Research"],
    ["acme", "ops", "clients", "Acme Corp Onboarding"],
    ["northwind", "ops", "clients", "Northwind Retainer"],
    ["hiring", "ops", null, "Hiring Pipeline"],
  ].map(([key, sp, fd, name], i) => ({
    id: "li_" + key,
    spaceId: "sp_" + sp,
    folderId: fd ? "fd_" + fd : null,
    name,
    description: `Planning and delivery for ${name}.`,
    isBacklog: i === 0,
    orderIndex: i,
    createdAt: ts(-100),
    archived: false,
  }));
  const short = (x) =>
    new Date(x + "T12:00").toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
    });
  const sprints = [21, 22, 23, 24].map((index, i) => ({
    id: "spr_" + index,
    folderId: "fd_sprints",
    spaceId: "sp_eng",
    index,
    name: `Sprint ${index} (${short(sd((i - 2) * 14))} - ${short(sd((i - 2) * 14 + 13))})`,
    startDate: sd((i - 2) * 14),
    endDate: sd((i - 2) * 14 + 13),
    status: i < 2 ? "done" : i === 2 ? "in_progress" : "not_started",
    goal:
      i === 2
        ? "Ship token refresh + webhook retries"
        : "Deliver reliable platform improvements",
    forecastPoints: [31, 34, 38, null][i],
    startedAt: i < 3 ? sts((i - 2) * 14) : null,
    startedBy: i < 3 ? "u_jordan" : null,
    completedAt: i < 2 ? sts((i - 2) * 14 + 13, 17) : null,
    completedBy: i < 2 ? "u_jordan" : null,
    completedPoints: i < 2 ? [31, 29][i] : null,
    committedTaskIds: [],
    completedTaskIds: [],
    spilloverTaskIds: i === 1 ? ["tsk_009", "tsk_010"] : [],
    spilloverToSprintId: i === 1 ? "spr_23" : null,
    createdAt: sts((i - 2) * 14 - 7),
    createdBy: "u_jordan",
  }));
  const current = [
    [
      "Implement token refresh for mobile API clients",
      "in progress",
      "high",
      ["priya"],
      5,
      2,
      ["backend", "security"],
    ],
    [
      "Webhook delivery retries with exponential backoff",
      "in progress",
      "high",
      ["priya", "diego"],
      8,
      4,
      ["backend"],
    ],
    [
      "Redesign notification settings page",
      "in review",
      "normal",
      ["marcus"],
      3,
      1,
      ["frontend"],
    ],
    [
      "Migrate billing service to Postgres 16",
      "in progress",
      "urgent",
      ["diego"],
      5,
      0,
      ["infra"],
    ],
    [
      "Add rate-limit headers to public API",
      "complete",
      "normal",
      ["priya"],
      2,
      -3,
      ["backend"],
    ],
    [
      "Fix flaky checkout E2E tests",
      "complete",
      "high",
      ["sam"],
      3,
      -4,
      ["qa", "tech-debt"],
    ],
    [
      "Dark mode tokens for dashboard widgets",
      "complete",
      "low",
      ["marcus"],
      2,
      -1,
      ["frontend"],
    ],
    [
      "Audit logging for admin actions",
      "to do",
      "normal",
      ["elena"],
      3,
      6,
      ["security"],
    ],
    [
      "Bulk export tasks to CSV",
      "in progress",
      "normal",
      ["marcus"],
      3,
      -1,
      ["frontend", "customer-request"],
    ],
    [
      "Search indexing for archived docs",
      "blocked",
      "normal",
      ["priya"],
      2,
      3,
      ["backend"],
    ],
    [
      "Load test webhook pipeline at 5k rps",
      "to do",
      "low",
      ["sam", "diego"],
      1,
      8,
      ["qa"],
    ],
    ["Release notes for v4.12", "complete", "low", ["jordan"], 1, -2, ["docs"]],
  ];
  const tasks = [];
  const make = (n, name, listId = "li_backlog", patch = {}) => {
    const list = lists.find((l) => l.id === listId),
      sp = spaces.find((s) => s.id === list.spaceId);
    return {
      id: typeof n === "string" ? n : "tsk_" + String(n).padStart(3, "0"),
      name,
      description: `${name}. Coordinate with the project owner, validate the acceptance criteria, and document the rollout.\n- Review implementation with the team\n- Confirm verification and release readiness`,
      status: sp.statuses[n % sp.statuses.length]?.name || sp.statuses[0].name,
      priority:
        ["urgent", "high", "normal", "low", null][Number(n) % 5] || null,
      assigneeIds: [users[Number(n) % users.length]?.id || "u_priya"],
      watcherIds: ["u_jordan"],
      tags: [],
      listId,
      sprintId: null,
      sprintHistory: [],
      parentId: null,
      startDate: Number(n) % 3 ? d(-4) : null,
      dueDate: Number(n) % 6 === 0 ? null : d((Number(n) % 12) - 4),
      timeEstimate: 60 + (Number(n) % 5 || 0) * 60,
      sprintPoints: null,
      customFields: {},
      checklists: [],
      linkedDocIds: [],
      dependencies: { waitingOn: [], blocking: [] },
      orderIndex: Number(n) * 1000 || 1000,
      createdBy: "u_elena",
      createdAt: ts(-25),
      updatedAt: ts(-1),
      dateClosed: null,
      closedBy: null,
      archived: false,
      deleted: false,
      deletedAt: null,
      deletedBy: null,
      ...patch,
    };
  };
  current.forEach(([name, status, priority, who, sprintPoints, due, tags], i) =>
    tasks.push(
      make(i + 1, name, "li_backlog", {
        status,
        priority,
        assigneeIds: who.map((x) => "u_" + x),
        sprintId: "spr_23",
        sprintHistory: i === 8 || i === 9 ? ["spr_22", "spr_23"] : ["spr_23"],
        sprintPoints,
        dueDate: d(due),
        tags,
        dateClosed:
          status === "complete" ? sts({ 4: 2, 5: 3, 6: 6, 11: 8 }[i]) : null,
        closedBy: status === "complete" ? "u_jordan" : null,
        customFields: { cf_component: i === 3 ? "opt_infra" : "opt_api" },
      }),
    ),
  );
  const groups = [
    [
      13,
      "backlog",
      [
        "SSO group sync for enterprise workspaces",
        "Keyboard shortcuts cheat sheet modal",
        "Upgrade React Native to 0.76",
      ],
    ],
    [
      16,
      "backlog",
      [
        "GraphQL pagination cursors",
        "Onboarding checklist empty states",
        "Sentry release tracking",
        "Fix timezone bug in due date picker",
        "Workspace usage metrics endpoint",
        "Refactor permissions middleware",
        "Avatar upload compression",
        "Slack integration v2 OAuth scopes",
      ],
    ],
    [
      24,
      "backlog",
      [
        "Two-factor recovery codes UI",
        "Postgres connection pooling",
        "Task duplication endpoint",
        "Mobile push notification batching",
        "Improve list view virtualization",
        "Migrate CI to GitHub Actions",
        "Doc export to PDF",
        "Fix comment reaction race condition",
      ],
    ],
    [
      32,
      "backlog",
      [
        "Gantt view dependency arrows",
        "Recurring task templates",
        "Offline mode for mobile docs",
        "Custom field formulas v2",
        "Reduce bundle size of editor",
        "Import from Trello",
        "Per-assignee sprint points",
        "Workload view capacity warnings",
        "Public API v3 deprecation plan",
        "Accessibility audit of task view",
        "Calendar sync with Outlook",
        "Rate limiting for AI endpoints",
      ],
    ],
    [
      44,
      "api",
      [
        "Zapier trigger for status change",
        "OpenAPI spec cleanup",
        "Webhook signature v2",
        "Partner API sandbox",
        "Pagination docs examples",
        "Deprecate v1 time tracking endpoint",
      ],
    ],
    [
      50,
      "bugs",
      [
        "Board view crashes when column has 500+ cards",
        "Due date shows wrong day for UTC+13",
        "Comment @mentions not notifying guests",
        "Duplicate tasks after offline sync",
        "Export CSV missing custom fields",
        "Sidebar flickers on Safari 18",
        "Time entry rounding off by 1 minute",
        "Doc page drag-and-drop loses nesting",
      ],
    ],
    [
      58,
      "infra",
      [
        "Rotate TLS certificates",
        "Terraform module for Redis",
        "On-call runbook update",
      ],
    ],
    [
      61,
      "launch",
      [
        "Launch landing page copy",
        "Product Hunt launch assets",
        "Press kit",
        "Customer webinar dry-run",
        "Pricing page A/B test",
        "Launch email sequence",
        "Partner co-marketing brief",
      ],
    ],
    [
      68,
      "content",
      [
        "How teams ship faster with sprints",
        "Customer story: Acme Corp",
        "November social calendar",
        "API best practices blog",
        "Year-end product newsletter",
      ],
    ],
    [
      73,
      "events",
      [
        "Platform roadmap webinar",
        "Customer community roundtable",
        "Developer conference sponsorship",
      ],
    ],
    [
      76,
      "dsys",
      [
        "Accessible form controls",
        "Navigation component refresh",
        "Design tokens documentation",
        "Table density guidelines",
      ],
    ],
    [
      80,
      "research",
      [
        "Interview enterprise admins",
        "Usability study: task creation",
        "Synthesize onboarding findings",
      ],
    ],
    [
      83,
      "acme",
      [
        "Acme kickoff workshop",
        "Configure Acme workspace hierarchy",
        "Acme admin training session",
        "Acme data migration from Asana",
      ],
    ],
    [
      87,
      "northwind",
      [
        "Monthly retainer report – November",
        "Northwind automation review",
        "Quarterly roadmap sync",
      ],
    ],
    [
      90,
      "hiring",
      [
        "Senior Frontend Engineer – screen candidates",
        "Draft DevOps job description",
        "Interview loop for QA Lead",
      ],
    ],
  ];
  groups.forEach(([start, key, names]) =>
    names.forEach((name, i) => {
      const n = start + i,
        p = {};
      if (start === 13)
        Object.assign(p, {
          status: "to do",
          sprintId: "spr_24",
          sprintHistory: ["spr_24"],
          sprintPoints: [8, 2, 5][i],
          assigneeIds: [i ? "u_marcus" : "u_priya"],
          dueDate: sd(20 + i),
        });
      if (start === 16 || start === 24) {
        const sid = start === 16 ? "spr_22" : "spr_21";
        Object.assign(p, {
          status: "complete",
          sprintId: sid,
          sprintHistory: [sid],
          sprintPoints: (start === 16
            ? [5, 3, 3, 2, 5, 3, 2, 6]
            : [3, 5, 2, 5, 3, 8, 2, 3])[i],
          dateClosed: sts((start === 16 ? -13 : -27) + i),
          closedBy: "u_jordan",
        });
      }
      if (start === 32)
        Object.assign(p, {
          status: "to do",
          sprintPoints: i % 3 ? null : [3, 5, 8, 2][i % 4],
          dueDate: i % 2 ? null : d(14 + i),
        });
      if (n >= 61 && n <= 75)
        p.assigneeIds = [["u_olivia", "u_noah", "u_aisha"][i % 3]];
      if ([61, 62, 68, 73, 76, 80, 83, 84, 85, 86, 87, 89, 90].includes(n))
        p.assigneeIds = ["u_jordan"];
      if (key === "bugs")
        Object.assign(p, {
          tags: ["bug"],
          priority: i < 2 ? "urgent" : "normal",
          customFields: {
            cf_component: "opt_web",
            cf_severity: "opt_s" + ((i % 3) + 1),
          },
        });
      if (n >= 61 && n <= 75)
        p.customFields = {
          cf_channel: ["Email", "Social", "Blog", "Paid", "Events"][i % 5]
            ? [
                [
                  "opt_email",
                  "opt_social",
                  "opt_blog",
                  "opt_paid",
                  "opt_events",
                ][i % 5],
              ]
            : [],
          cf_budget: 2500 + i * 500,
        };
      if (n >= 83 && n <= 89)
        p.customFields = {
          cf_client: key === "acme" ? "opt_acme" : "opt_northwind",
          cf_rate: 150,
        };
      tasks.push(make(n, name, "li_" + key, p));
    }),
  );
  [
    [
      "tsk_001a",
      "tsk_001",
      "Persist refresh token in secure storage",
      "complete",
      "priya",
    ],
    [
      "tsk_001b",
      "tsk_001",
      "Handle 401 retry in API client",
      "in progress",
      "priya",
    ],
    [
      "tsk_002a",
      "tsk_002",
      "Dead-letter queue for failed webhooks",
      "to do",
      "diego",
    ],
    ["tsk_002b", "tsk_002", "Retry policy config UI", "to do", "marcus"],
    [
      "tsk_004a",
      "tsk_004",
      "Dry-run migration on staging",
      "complete",
      "diego",
    ],
  ].forEach(([id, parentId, name, status, u], i) =>
    tasks.push(
      make(id, name, "li_backlog", {
        parentId,
        status,
        assigneeIds: ["u_" + u],
        sprintId: "spr_23",
        sprintHistory: ["spr_23"],
        sprintPoints: 0,
        dateClosed: status === "complete" ? ts(-2) : null,
        orderIndex: i * 1000,
      }),
    ),
  );
  tasks
    .filter((t) =>
      ["tsk_001", "tsk_002", "tsk_004", "tsk_061", "tsk_083"].includes(t.id),
    )
    .forEach((t, i) => {
      t.checklists = [
        {
          id: "ck_" + i,
          name: "Release checklist",
          items: [
            "Review requirements",
            "Verify with stakeholders",
            "Update documentation",
            "Confirm rollout",
          ].map((name, j) => ({
            id: `cki_${i}_${j}`,
            name,
            resolved: j < 2,
            assigneeId: j === 0 ? t.assigneeIds[0] : null,
          })),
        },
      ];
    });
  tasks.find((t) => t.id === "tsk_071").archived = true;
  tasks.find((t) => t.id === "tsk_079").archived = true;
  Object.assign(
    tasks.find((t) => t.id === "tsk_092"),
    { deleted: true, deletedAt: ts(-2), deletedBy: "u_jordan" },
  );
  tasks.forEach((t) => {
    if (["complete", "closed"].includes(t.status) && !t.dateClosed) {
      t.dateClosed = ts(-2);
      t.closedBy = t.assigneeIds[0];
    }
  });
  sprints.forEach((sp) => {
    sp.committedTaskIds = tasks
      .filter((t) => !t.parentId && t.sprintId === sp.id)
      .map((t) => t.id);
    if (sp.id === "spr_22") sp.committedTaskIds.push("tsk_009", "tsk_010");
    sp.completedTaskIds =
      sp.status === "done"
        ? tasks
            .filter((t) => t.sprintId === sp.id && t.dateClosed)
            .map((t) => t.id)
        : [];
  });
  const customFields = [
    {
      id: "cf_component",
      name: "Component",
      type: "dropdown",
      scope: { type: "space", id: "sp_eng" },
      options: [
        ["web", "Web App"],
        ["api", "API"],
        ["mobile", "Mobile"],
        ["infra", "Infra"],
      ].map(([id, name], i) => ({ id: "opt_" + id, name, color: colors[i] })),
    },
    {
      id: "cf_severity",
      name: "Severity",
      type: "dropdown",
      scope: { type: "list", id: "li_bugs" },
      options: ["S1 – Critical", "S2 – Major", "S3 – Minor"].map((name, i) => ({
        id: "opt_s" + (i + 1),
        name,
        color: colors[i + 4],
      })),
    },
    {
      id: "cf_channel",
      name: "Channel",
      type: "labels",
      scope: { type: "space", id: "sp_mkt" },
      options: ["Email", "Social", "Blog", "Paid", "Events"].map((name) => ({
        id: "opt_" + name.toLowerCase(),
        name,
        color: "#0091FF",
      })),
    },
    {
      id: "cf_budget",
      name: "Budget",
      type: "currency",
      scope: { type: "space", id: "sp_mkt" },
      currency: "USD",
    },
    {
      id: "cf_client",
      name: "Client",
      type: "dropdown",
      scope: { type: "folder", id: "fd_clients" },
      options: [
        { id: "opt_acme", name: "Acme Corp" },
        { id: "opt_northwind", name: "Northwind Traders" },
      ],
    },
    {
      id: "cf_rate",
      name: "Hourly Rate",
      type: "currency",
      scope: { type: "folder", id: "fd_clients" },
      currency: "USD",
    },
  ];
  const tags = [];
  [
    [
      "sp_eng",
      [
        "backend",
        "frontend",
        "infra",
        "security",
        "qa",
        "tech-debt",
        "customer-request",
        "bug",
        "docs",
      ],
    ],
    ["sp_mkt", ["launch", "seo", "social", "email"]],
    ["sp_design", ["ux", "ui-kit"]],
    ["sp_ops", ["client", "hiring"]],
  ].forEach(([spaceId, names]) =>
    names.forEach((name, i) =>
      tags.push({
        name,
        spaceId,
        fg: colors[i % colors.length],
        bg: colors[i % colors.length] + "18",
      }),
    ),
  );
  const docSpecs = [
    [
      "Engineering Handbook",
      "📘",
      "space",
      "sp_eng",
      "elena",
      true,
      [
        "Overview",
        "Code Review Guidelines",
        "On-call Rotation",
        "Escalation Policy",
        "Release Process",
      ],
    ],
    [
      "Sprint 23 Planning Notes",
      "🗓️",
      "folder",
      "fd_sprints",
      "jordan",
      false,
      ["Goals & Scope", "Capacity", "Risks"],
    ],
    [
      "API Design Guidelines",
      "🔌",
      "list",
      "li_api",
      "priya",
      false,
      ["Principles", "Versioning", "Error Format"],
    ],
    [
      "Incident Postmortem – Billing Outage",
      "🚨",
      "space",
      "sp_eng",
      "diego",
      false,
      ["Summary", "Timeline", "Action Items"],
    ],
    [
      "Q4 Launch Brief",
      "🚀",
      "list",
      "li_launch",
      "olivia",
      false,
      ["Positioning", "Audience", "Launch Timeline", "Budget"],
    ],
    [
      "Brand Voice & Messaging",
      "✍️",
      "space",
      "sp_mkt",
      "noah",
      true,
      ["Voice Principles", "Words We Use"],
    ],
    [
      "Design System Principles",
      "🎨",
      "space",
      "sp_design",
      "hannah",
      true,
      ["Foundations", "Color", "Typography", "Components"],
    ],
    [
      "Acme Corp Onboarding Plan",
      "🤝",
      "folder",
      "fd_clients",
      "ben",
      false,
      ["Scope", "Schedule", "Stakeholders"],
    ],
    [
      "New Hire Onboarding Checklist",
      "✅",
      "space",
      "sp_ops",
      "grace",
      true,
      ["Week 1", "Week 2"],
    ],
    [
      "Weekly Product Sync – Notes",
      "📝",
      "workspace",
      null,
      "jordan",
      false,
      ["Agenda Template", "Last Week’s Sync", "This Week’s Sync"],
    ],
    [
      "Q3 Retro (old)",
      "🗃️",
      "workspace",
      null,
      "jordan",
      false,
      ["Retrospective"],
    ],
  ];
  const docs = [],
    docPages = [];
  docSpecs.forEach(([title, icon, type, loc, owner, wiki, pages], i) => {
    const id = "doc_" + String(i + 1).padStart(3, "0");
    docs.push({
      id,
      title,
      icon,
      location: { type, id: loc },
      ownerId: "u_" + owner,
      isWiki: wiki,
      tags: wiki ? ["handbook"] : ["planning"],
      sharing: {
        visibility: "workspace",
        memberIds: ["u_jordan"],
        memberPermissions: { u_jordan: "edit" },
        defaultPermission: "edit",
        publicLinkEnabled: false,
      },
      linkedTaskIds: i === 1 ? ["tsk_001", "tsk_002"] : [],
      archived: i === 10,
      deleted: false,
      deletedAt: null,
      createdAt: ts(-30 - i),
      createdBy: "u_" + owner,
      updatedAt: ts(-i % 5),
      updatedBy: "u_" + owner,
      lastViewedAt: ts(-i % 4),
    });
    let root = null;
    pages.forEach((title, j) => {
      const pg = "pg_" + String(docPages.length + 1).padStart(3, "0");
      if (!j) root = pg;
      const block = (type, text, k, extra = {}) => ({
        id: `b_${pg}_${k}`,
        type,
        text,
        ...extra,
      });
      docPages.push({
        id: pg,
        docId: id,
        parentPageId:
          (i === 0 && j === 3) || (i === 6 && [1, 2].includes(j)) ? root : null,
        title,
        icon: null,
        cover: null,
        orderIndex: j * 1000,
        blocks: [
          block("h1", title, 0),
          block(
            "paragraph",
            `This ${title.toLowerCase()} captures the decisions and working agreements for ${docSpecs[i][0]}. Keep this page up to date as the project evolves.`,
            1,
          ),
          block(
            "bullet",
            "Review goals with the project owner before starting implementation.",
            2,
          ),
          block("todo", "Share updates in the weekly team review.", 3, {
            checked: false,
          }),
          block(
            [
              "quote",
              "code",
              "callout",
              "numbered",
              "h2",
              "h3",
              "divider",
              "task_link",
            ][j % 8],
            j % 8 === 1
              ? "GET /api/v3/tasks"
              : "Make it clear, reliable, and easy to maintain.",
            4,
            j % 8 === 7 ? { taskId: "tsk_008" } : {},
          ),
        ],
        createdAt: ts(-30),
        createdBy: "u_" + owner,
        updatedAt: ts(-1),
        updatedBy: "u_" + owner,
      });
    });
  });
  docPages.slice(0, 8).forEach((p, i) => {
    const type = [
      "h2",
      "h3",
      "quote",
      "code",
      "divider",
      "callout",
      "numbered",
      "task_link",
    ][i];
    p.blocks.push({
      id: "b_extra_" + i,
      type,
      text:
        type === "code"
          ? "GET /api/v3/tasks"
          : type === "callout"
            ? "Keep the customer experience at the center of every decision."
            : "Delivery standards and next steps",
      ...(type === "task_link" ? { taskId: "tsk_001" } : {}),
    });
  });
  tasks[0].linkedDocIds = ["doc_002"];
  tasks[1].linkedDocIds = ["doc_002"];
  const commentTexts = [
    "Can we make sure the refresh token TTL is configurable per workspace?",
    "The staging implementation is ready for review. @Jordan Rivera please take a look.",
    "I verified the edge cases and added the findings to our planning doc.",
    "Let’s prioritize reliability before the launch.",
    "The rollout checklist looks good. I will coordinate with support.",
    "Thanks for the update! This unblocks the next milestone.",
  ];
  const comments = Array.from({ length: 44 }, (_, i) => ({
    id: "cm_" + String(i + 1).padStart(3, "0"),
    parentType: i < 38 ? "task" : "doc",
    parentId: i < 38 ? tasks[i % 8].id : docs[(i - 38) % 3].id,
    pageId:
      i < 38
        ? null
        : docPages.find((p) => p.docId === docs[(i - 38) % 3].id).id,
    authorId: users[i % 7].id,
    text: commentTexts[i % 6],
    mentions: i % 6 === 1 ? ["u_jordan"] : [],
    createdAt: ts(-Math.floor(i / 8) - 1, 10 + (i % 7)),
    updatedAt: null,
    resolved: i === 5,
    assigneeId: i === 4 ? "u_jordan" : i === 5 ? "u_priya" : null,
    reactions: i < 8 ? [{ emoji: "👍", userIds: ["u_priya", "u_jordan"] }] : [],
    replyToId: i === 8 ? "cm_001" : i === 9 ? "cm_002" : null,
  }));
  const activity = tasks.slice(0, 70).map((t, i) => ({
    id: "ac_" + String(i + 1).padStart(3, "0"),
    taskId: t.id,
    actorId: t.createdBy,
    type: "created",
    field: null,
    from: null,
    to: null,
    createdAt: t.createdAt,
  }));
  tasks.slice(0, 12).forEach((t, i) =>
    activity.push({
      id: "ac_" + (71 + i),
      taskId: t.id,
      actorId: t.assigneeIds[0],
      type: "status_changed",
      field: "status",
      from: "to do",
      to: t.status,
      createdAt: ts(-3, 10 + (i % 7)),
    }),
  );
  ["tsk_009", "tsk_010"].forEach((taskId, i) =>
    activity.push({
      id: "ac_spill_" + i,
      taskId,
      actorId: "u_jordan",
      type: "sprint_added",
      field: "sprintId",
      from: "spr_22",
      to: "spr_23",
      createdAt: sts(0),
    }),
  );
  const timeTags = [
    "Meeting",
    "Development",
    "Code Review",
    "Support",
    "Admin",
  ].map((name, i) => ({
    id: ["tt_meeting", "tt_dev", "tt_review", "tt_support", "tt_admin"][i],
    name,
    color: colors[i + 1],
  }));
  const timeEntries = [];
  const addEntry = (userId, day, k, taskId, duration) => {
    const x = add(today, day);
    x.setHours(8 + (k % 3) * 3, 30, 0, 0);
    const end = new Date(+x + duration * 1000);
    if (end > now) return;
    const task = tasks.find((t) => t.id === taskId),
      billable = ["li_acme", "li_northwind"].includes(task?.listId);
    timeEntries.push({
      id: "te_" + String(timeEntries.length + 1).padStart(3, "0"),
      taskId,
      userId,
      start: x.toISOString(),
      end: end.toISOString(),
      duration,
      billable,
      description: task
        ? `${task.name} — ${k % 2 ? "implementation and review" : "planning and coordination"}`
        : "Interviewing",
      tagIds: [timeTags[k % 5].id],
      source: k % 2 ? "manual" : "timer",
      locked: false,
      createdAt: x.toISOString(),
      updatedAt: x.toISOString(),
    });
  };
  for (let day = -dow - 14; day < 0; day++) {
    const dt = add(today, day);
    if ([0, 6].includes(dt.getDay())) continue;
    for (let k = 0; k < (day >= -dow ? 3 : 2); k++)
      addEntry(
        "u_jordan",
        day,
        k,
        [
          null,
          "tsk_083",
          "tsk_084",
          "tsk_012",
          "tsk_061",
          "tsk_087",
          "tsk_085",
        ][((day + 40) * 2 + k) % 7],
        (k === 1 ? 120 : 150) * 60,
      );
  }
  [0, 2].forEach((offset, i) =>
    addEntry(
      "u_jordan",
      -dow - 7 + offset,
      2,
      ["tsk_085", "tsk_087"][i],
      90 * 60,
    ),
  );
  ["u_priya", "u_marcus", "u_diego", "u_sam", "u_ben"].forEach((u, i) => {
    for (let k = 0; k < (u === "u_ben" ? 6 : 8); k++) {
      let offset = -dow - 7 + (k % 5);
      if (k > 4) offset = -dow - 14 + (k - 5);
      if (u === "u_sam" && k < 4) offset -= 7;
      addEntry(
        u,
        offset,
        k % 3,
        i === 4 ? "tsk_083" : tasks[(i * 2 + k) % 12].id,
        (90 + (k % 3) * 30) * 60,
      );
    }
  });
  ["u_priya", "u_marcus", "u_diego", "u_sam"].forEach((u, i) => {
    for (let k = 0; k < 2; k++)
      addEntry(u, -dow + k, 0, tasks[i * 2].id, 120 * 60);
  });
  let noTaskCount = 0;
  timeEntries
    .filter((e) => e.userId === "u_jordan")
    .forEach((e) => {
      if (!e.taskId && ++noTaskCount > 2) {
        e.taskId = "tsk_087";
        e.billable = true;
        e.description = "Monthly retainer report – November";
      }
    });
  const timesheetSettings = {
    approvalsEnabled: true,
    deadline: { day: "monday", time: "10:00" },
    reminders: { before: true, after: true },
    approvers: {
      u_jordan: ["u_elena"],
      u_priya: ["u_jordan"],
      u_marcus: ["u_jordan"],
      u_diego: ["u_jordan"],
      u_sam: ["u_jordan"],
      u_ben: ["u_jordan"],
    },
    dailyCapacityHours: 8,
    weeklyCapacityHours: 40,
  };
  const timesheets = [
    ["u_jordan", -14, "approved", "u_elena"],
    ["u_jordan", -7, "submitted", "u_elena"],
    ["u_priya", -7, "submitted", "u_jordan"],
    ["u_marcus", -7, "changes_requested", "u_jordan"],
    ["u_diego", -7, "submitted", "u_jordan"],
    ["u_sam", -14, "approved", "u_jordan"],
  ].map(([userId, offset, status, reviewer], i) => {
    const periodStart = d(-dow + offset),
      periodEnd = d(-dow + offset + 6),
      entries = timeEntries.filter(
        (e) =>
          e.userId === userId &&
          fmt(new Date(e.start)) >= periodStart &&
          fmt(new Date(e.start)) <= periodEnd,
      );
    entries.forEach((e) => (e.locked = status !== "changes_requested"));
    const submittedAt = ts(-dow + offset + 7, 9),
      reviewComment =
        status === "changes_requested"
          ? "Please split the 6h block on Tuesday across the tasks you worked on."
          : "";
    return {
      id: "tsh_" + String(i + 1).padStart(3, "0"),
      userId,
      periodStart,
      periodEnd,
      status,
      totalSeconds: entries.reduce((s, e) => s + e.duration, 0),
      billableSeconds: entries
        .filter((e) => e.billable)
        .reduce((s, e) => s + e.duration, 0),
      entryIds: entries.map((e) => e.id),
      approverIds: [reviewer],
      submittedAt,
      reviewedBy: status === "submitted" ? null : reviewer,
      reviewedAt: status === "submitted" ? null : submittedAt,
      reviewComment,
      history: [
        { action: "submitted", userId, at: submittedAt, comment: "" },
        ...(status === "submitted"
          ? []
          : [
              {
                action: status,
                userId: reviewer,
                at: submittedAt,
                comment: reviewComment,
              },
            ]),
      ],
      comments: [],
    };
  });
  const types = [
    "assigned",
    "mention",
    "comment",
    "status_changed",
    "due_date",
    "doc_comment",
    "timesheet_submitted",
    "timesheet_approved",
    "sprint_started",
  ];
  const notifications = Array.from({ length: 22 }, (_, i) => ({
    id: "nt_" + String(i + 1).padStart(3, "0"),
    userId: "u_jordan",
    type: types[i % 9],
    actorId: users[(i + 3) % 12].id,
    taskId: tasks[i % 12].id,
    docId: i % 9 === 5 ? "doc_002" : null,
    timesheetId:
      i % 9 === 6
        ? i < 9
          ? "tsh_003"
          : "tsh_005"
        : i % 9 === 7
          ? "tsh_001"
          : null,
    commentId: i % 9 === 1 ? "cm_005" : null,
    text: [
      "assigned this task to you",
      "mentioned you in a comment",
      "commented on a task",
      "changed the status",
      "updated the due date",
      "commented on a Doc",
      "submitted a timesheet for approval",
      "approved your timesheet",
      "started Sprint 23",
    ][i % 9],
    createdAt: ts(-Math.floor(i / 4), 9 + (i % 8)),
    read: i >= 9,
    cleared: i >= 18,
    savedForLater: i === 10,
  }));
  return {
    workspace: {
      id: "ws_9012",
      name: "Lumen Labs",
      initials: "L",
      color: "#E5484D",
      plan: "Business Plus",
      clickApps: {
        sprintPoints: true,
        timeTracking: true,
        timeEstimates: true,
        multipleAssignees: true,
        billableDefault: false,
      },
      sprintPointScale: [1, 2, 3, 5, 8, 13],
    },
    currentUserId: "u_jordan",
    users,
    teams,
    spaces,
    folders,
    lists,
    sprints,
    tasks,
    customFields,
    tags,
    comments,
    activity,
    docs,
    docPages,
    timeEntries,
    timer: null,
    timeTags,
    timesheets,
    timesheetSettings,
    notifications,
    favorites: [
      { type: "sprint", id: "spr_23" },
      { type: "list", id: "li_launch" },
      { type: "doc", id: "doc_001" },
    ],
    viewSettings: {},
    preferences: { theme: "light", startOfWeek: "monday", timeFormat: "12h" },
    dashboards: [
      {
        id: "dash_platform",
        name: "Platform Sprint Dashboard",
        widgets: [
          "sprint_burndown",
          "velocity",
          "time_by_user",
          "tasks_by_status",
          "overdue",
        ],
      },
    ],
    trash: [],
  };
}
