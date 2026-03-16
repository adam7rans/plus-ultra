import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── Identity (NO private keys — priv/epriv stay in IDB only) ──
  users: defineTable({
    pub: v.string(),
    epub: v.string(),
    displayName: v.optional(v.string()),
    createdAt: v.number(),
    backedUp: v.boolean(),
  }).index("by_pub", ["pub"]),

  // ── Tribes ──
  tribes: defineTable({
    id: v.string(),
    pub: v.string(),
    epub: v.optional(v.string()),
    name: v.string(),
    location: v.string(),
    region: v.string(),
    createdAt: v.number(),
    constitutionTemplate: v.union(
      v.literal("direct_democracy"),
      v.literal("council"),
      v.literal("hybrid"),
    ),
    founderId: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    deleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_tribe_id", ["id"]),

  // ── Tribe Members (NO photo — base64 too large for Convex) ──
  tribe_members: defineTable({
    pubkey: v.string(),
    tribeId: v.string(),
    joinedAt: v.number(),
    lastSeen: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("away_declared"),
      v.literal("away_undeclared"),
      v.literal("departed"),
    ),
    attachmentScore: v.number(),
    declaredReturnAt: v.optional(v.number()),
    memberType: v.union(
      v.literal("adult"),
      v.literal("dependent"),
      v.literal("child"),
      v.literal("elder"),
    ),
    authorityRole: v.optional(
      v.union(
        v.literal("founder"),
        v.literal("elder_council"),
        v.literal("lead"),
        v.literal("member"),
        v.literal("restricted"),
      ),
    ),
    role: v.optional(v.string()),
    displayName: v.string(),
    epub: v.optional(v.string()),
    isDiplomat: v.optional(v.boolean()),
    bio: v.optional(v.string()),
    availability: v.optional(
      v.union(
        v.literal("full_time"),
        v.literal("part_time"),
        v.literal("on_call"),
      ),
    ),
    physicalLimitations: v.optional(v.string()),
    bloodType: v.optional(v.string()),
    allergies: v.optional(v.array(v.string())),
    medications: v.optional(v.array(v.string())),
    medicalConditions: v.optional(v.array(v.string())),
    currentHealthStatus: v.optional(
      v.union(
        v.literal("well"),
        v.literal("minor_injury"),
        v.literal("major_injury"),
        v.literal("critical"),
        v.literal("deceased"),
      ),
    ),
    healthStatusUpdatedAt: v.optional(v.number()),
    healthStatusUpdatedBy: v.optional(v.string()),
  })
    .index("by_tribe", ["tribeId"])
    .index("by_pubkey", ["pubkey"]),

  // ── Invite Tokens ──
  invite_tokens: defineTable({
    token: v.string(),
    tribeId: v.string(),
    expiresAt: v.number(),
    used: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_tribe", ["tribeId"])
    .index("by_token", ["token"]),

  // ── Messages ──
  messages: defineTable({
    msgId: v.string(),
    tribeId: v.string(),
    channelId: v.string(),
    senderId: v.string(),
    type: v.union(
      v.literal("text"),
      v.literal("voice"),
      v.literal("photo"),
    ),
    content: v.string(),
    mimeType: v.optional(v.string()),
    sentAt: v.number(),
    deliveredAt: v.optional(v.number()),
    sig: v.string(),
    replyTo: v.optional(v.string()),
    reactions: v.optional(v.any()),
  })
    .index("by_tribe", ["tribeId"])
    .index("by_channel", ["channelId", "sentAt"]),

  // ── Channel Reads ──
  channel_reads: defineTable({
    channelId: v.string(),
    memberPub: v.string(),
    lastReadAt: v.number(),
  }).index("by_channel_member", ["channelId", "memberPub"]),

  // ── Skills ──
  skills: defineTable({
    memberId: v.string(),
    tribeId: v.string(),
    role: v.string(),
    proficiency: v.union(
      v.literal("basic"),
      v.literal("intermediate"),
      v.literal("expert"),
      v.literal("verified_expert"),
    ),
    declaredAt: v.number(),
    vouchedBy: v.array(v.string()),
    specializations: v.optional(v.array(v.string())),
    yearsExperience: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_tribe", ["tribeId"])
    .index("by_member", ["tribeId", "memberId"]),

  // ── Training Sessions ──
  training_sessions: defineTable({
    sessionId: v.string(),
    tribeId: v.string(),
    title: v.string(),
    skillRole: v.optional(v.string()),
    date: v.number(),
    durationMinutes: v.number(),
    trainerId: v.string(),
    attendees: v.array(v.string()),
    notes: v.string(),
    loggedBy: v.string(),
    loggedAt: v.number(),
  }).index("by_tribe", ["tribeId"]),

  // ── Certifications ──
  certifications: defineTable({
    certId: v.string(),
    tribeId: v.string(),
    memberId: v.string(),
    certName: v.string(),
    issuingBody: v.string(),
    licenseNumber: v.string(),
    issuedAt: v.number(),
    expiresAt: v.number(),
    linkedRole: v.optional(v.string()),
    verifiedBy: v.string(),
    verifiedAt: v.number(),
    addedBy: v.string(),
    addedAt: v.number(),
  }).index("by_tribe", ["tribeId"]),

  // ── Inventory ──
  inventory: defineTable({
    tribeId: v.string(),
    asset: v.string(),
    quantity: v.number(),
    notes: v.string(),
    updatedAt: v.number(),
    updatedBy: v.string(),
  }).index("by_tribe", ["tribeId"]),

  // ── Consumption Log ──
  consumption_log: defineTable({
    entryId: v.string(),
    tribeId: v.string(),
    asset: v.string(),
    amount: v.number(),
    periodDays: v.number(),
    loggedAt: v.number(),
    loggedBy: v.string(),
    notes: v.string(),
  }).index("by_tribe", ["tribeId"]),

  // ── Production Log ──
  production_log: defineTable({
    entryId: v.string(),
    tribeId: v.string(),
    assetType: v.string(),
    amount: v.number(),
    periodDays: v.number(),
    loggedAt: v.number(),
    loggedBy: v.string(),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_tribe", ["tribeId"]),

  // ── Proposals ──
  proposals: defineTable({
    proposalId: v.string(),
    tribeId: v.string(),
    title: v.string(),
    body: v.string(),
    scope: v.union(v.literal("operational"), v.literal("major")),
    createdBy: v.string(),
    createdAt: v.number(),
    closesAt: v.number(),
    status: v.union(
      v.literal("open"),
      v.literal("closed"),
      v.literal("withdrawn"),
    ),
    outcome: v.union(
      v.literal("passed"),
      v.literal("failed"),
      v.literal("withdrawn"),
      v.literal("none"),
    ),
    closedAt: v.number(),
    closedBy: v.string(),
  }).index("by_tribe", ["tribeId"]),

  // ── Proposal Votes ──
  proposal_votes: defineTable({
    proposalId: v.string(),
    tribeId: v.string(),
    memberPub: v.string(),
    choice: v.union(
      v.literal("yes"),
      v.literal("no"),
      v.literal("abstain"),
    ),
    castAt: v.number(),
  })
    .index("by_tribe", ["tribeId"])
    .index("by_proposal", ["proposalId"]),

  // ── Proposal Comments ──
  proposal_comments: defineTable({
    commentId: v.string(),
    proposalId: v.string(),
    tribeId: v.string(),
    authorPub: v.string(),
    body: v.string(),
    postedAt: v.number(),
  })
    .index("by_tribe", ["tribeId"])
    .index("by_proposal", ["proposalId"]),

  // ── Map Pins ──
  map_pins: defineTable({
    pinId: v.string(),
    tribeId: v.string(),
    assetType: v.string(),
    label: v.string(),
    notes: v.string(),
    lat: v.number(),
    lng: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
  }).index("by_tribe", ["tribeId"]),

  // ── Patrol Routes ──
  patrol_routes: defineTable({
    routeId: v.string(),
    tribeId: v.string(),
    name: v.string(),
    waypoints: v.array(v.object({ lat: v.number(), lng: v.number() })),
    notes: v.string(),
    assignedTo: v.string(),
    scheduleEventId: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
  }).index("by_tribe", ["tribeId"]),

  // ── Map Territory ──
  map_territory: defineTable({
    tribeId: v.string(),
    polygon: v.array(v.object({ lat: v.number(), lng: v.number() })),
    updatedAt: v.number(),
    updatedBy: v.string(),
  }).index("by_tribe", ["tribeId"]),

  // ── Notifications ──
  notifications: defineTable({
    notifId: v.string(),
    tribeId: v.string(),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    createdAt: v.number(),
    targetPub: v.string(),
    actorPub: v.optional(v.string()),
    linkTo: v.optional(v.string()),
    read: v.boolean(),
  })
    .index("by_tribe", ["tribeId"])
    .index("by_tribe_target", ["tribeId", "targetPub"]),

  // ── Alerts ──
  alerts: defineTable({
    alertId: v.string(),
    tribeId: v.string(),
    alertType: v.string(),
    message: v.string(),
    senderPub: v.string(),
    senderName: v.string(),
    createdAt: v.number(),
    dismissed: v.optional(v.boolean()),
  }).index("by_tribe", ["tribeId"]),

  // ── Events ──
  events: defineTable({
    eventId: v.string(),
    tribeId: v.string(),
    type: v.string(),
    title: v.string(),
    description: v.string(),
    startAt: v.number(),
    durationMin: v.number(),
    recurrence: v.object({
      frequency: v.string(),
      interval: v.number(),
      customUnit: v.optional(v.string()),
      daysOfWeek: v.optional(v.array(v.number())),
      endAt: v.optional(v.number()),
    }),
    createdBy: v.string(),
    createdAt: v.number(),
    assignedTo: v.array(v.string()),
    location: v.string(),
    cancelled: v.boolean(),
  }).index("by_tribe", ["tribeId"]),

  // ── Tribe Tasks ──
  tribe_tasks: defineTable({
    taskId: v.string(),
    tribeId: v.string(),
    goalId: v.optional(v.string()),
    milestoneId: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("blocked"),
      v.literal("done"),
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("critical"),
    ),
    assignedTo: v.array(v.string()),
    dueDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.string(),
    updatedAt: v.number(),
  }).index("by_tribe", ["tribeId"]),

  // ── Tribe Goals ──
  tribe_goals: defineTable({
    goalId: v.string(),
    tribeId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    horizon: v.union(
      v.literal("immediate"),
      v.literal("short_term"),
      v.literal("long_term"),
    ),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    linkedProposalId: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.string(),
    updatedAt: v.number(),
  }).index("by_tribe", ["tribeId"]),

  // ── Goal Milestones ──
  goal_milestones: defineTable({
    milestoneId: v.string(),
    goalId: v.string(),
    tribeId: v.string(),
    title: v.string(),
    dueDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_tribe", ["tribeId"]),

  // ── Tribe Docs ──
  tribe_docs: defineTable({
    docId: v.string(),
    tribeId: v.string(),
    title: v.string(),
    category: v.string(),
    status: v.string(),
    content: v.string(),
    version: v.number(),
    authorPub: v.string(),
    approvedBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    approvedAt: v.optional(v.number()),
    linkedRoles: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
  }).index("by_tribe", ["tribeId"]),

  // ── Tribe Expenses ──
  tribe_expenses: defineTable({
    expenseId: v.string(),
    tribeId: v.string(),
    category: v.string(),
    description: v.string(),
    amountCents: v.number(),
    currency: v.string(),
    paidBy: v.string(),
    splitAmong: v.array(v.string()),
    linkedAssetType: v.optional(v.string()),
    receiptNote: v.optional(v.string()),
    loggedAt: v.number(),
    loggedBy: v.string(),
  }).index("by_tribe", ["tribeId"]),

  // ── Tribe Contributions ──
  tribe_contributions: defineTable({
    contributionId: v.string(),
    tribeId: v.string(),
    memberPub: v.string(),
    amountCents: v.number(),
    currency: v.string(),
    note: v.optional(v.string()),
    contributedAt: v.number(),
  }).index("by_tribe", ["tribeId"]),

  // ── Psych Profiles ──
  psych_profiles: defineTable({
    memberId: v.string(),
    tribeId: v.string(),
    archetype: v.string(),
    dimensions: v.object({
      decisionSpeed: v.number(),
      stressTolerance: v.number(),
      leadershipStyle: v.number(),
      conflictApproach: v.number(),
      riskAppetite: v.number(),
      socialEnergy: v.number(),
    }),
    quizCompletedAt: v.optional(v.union(v.number(), v.null())),
    lastUpdatedAt: v.number(),
    peerDimensions: v.any(),
    peerRatingCount: v.number(),
  }).index("by_tribe", ["tribeId"]),

  // ── Peer Ratings ──
  peer_ratings: defineTable({
    ratingId: v.string(),
    tribeId: v.string(),
    ratedPub: v.string(),
    stressTolerance: v.number(),
    leadershipStyle: v.number(),
    conflictApproach: v.number(),
    ratedAt: v.number(),
  }).index("by_tribe", ["tribeId"]),

  // ── External Contacts ──
  external_contacts: defineTable({
    contactId: v.string(),
    tribeId: v.string(),
    name: v.string(),
    category: v.string(),
    role: v.optional(v.string()),
    phone: v.optional(v.string()),
    radioFreq: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    addedBy: v.string(),
    addedAt: v.number(),
    lastVerified: v.optional(v.number()),
  }).index("by_tribe", ["tribeId"]),

  // ── My People ──
  my_people: defineTable({
    tribeId: v.string(),
    myPubkey: v.string(),
    data: v.any(),
  }).index("by_tribe", ["tribeId"]),

  // ── Muster Calls ──
  muster_calls: defineTable({
    musterId: v.string(),
    tribeId: v.string(),
    initiatedBy: v.string(),
    initiatedByName: v.string(),
    initiatedAt: v.number(),
    closedAt: v.optional(v.number()),
    reason: v.string(),
    message: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("closed")),
  }).index("by_tribe", ["tribeId"]),

  // ── Muster Responses (NO voiceNote) ──
  muster_responses: defineTable({
    musterId: v.string(),
    memberPub: v.string(),
    memberName: v.string(),
    status: v.string(),
    respondedAt: v.number(),
    respondedByPub: v.string(),
    location: v.optional(v.string()),
    note: v.optional(v.string()),
  }).index("by_muster", ["musterId"]),

  // ── Bug-Out Plans ──
  bugout_plans: defineTable({
    planId: v.string(),
    tribeId: v.string(),
    name: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("ready"),
      v.literal("active"),
    ),
    triggerCondition: v.string(),
    routeId: v.optional(v.string()),
    vehicles: v.any(),
    loadPriorities: v.any(),
    rallyPointIds: v.any(),
    notes: v.optional(v.string()),
    activatedAt: v.optional(v.number()),
    activatedBy: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.string(),
    updatedAt: v.number(),
  }).index("by_tribe", ["tribeId"]),

  // ── PACE Plan ──
  pace_plan: defineTable({
    tribeId: v.string(),
    methods: v.any(),
    checkInSchedules: v.any(),
    rallyPoints: v.any(),
    codeWords: v.optional(v.any()),
    lastUpdatedAt: v.number(),
    lastUpdatedBy: v.string(),
  }).index("by_tribe", ["tribeId"]),

  // ── Grid State ──
  grid_state: defineTable({
    tribeId: v.string(),
    mode: v.union(v.literal("up"), v.literal("down")),
    isSimulation: v.boolean(),
    setBy: v.string(),
    setByName: v.string(),
    setAt: v.number(),
    expiresAt: v.number(),
    message: v.optional(v.string()),
  }).index("by_tribe", ["tribeId"]),

  // ── Member Infra Status ──
  member_infra_status: defineTable({
    memberPub: v.string(),
    tribeId: v.string(),
    failingItems: v.array(v.string()),
    updatedAt: v.number(),
    displayName: v.string(),
  }).index("by_tribe", ["tribeId"]),

  // ── Federation Relationships ──
  federation_relationships: defineTable({
    channelId: v.string(),
    myTribeId: v.string(),
    otherTribeId: v.string(),
    otherTribeName: v.string(),
    otherTribeLocation: v.string(),
    otherTribePub: v.string(),
    otherTribeEpub: v.string(),
    status: v.union(
      v.literal("contact"),
      v.literal("allied"),
      v.literal("distrusted"),
    ),
    initiatedBy: v.string(),
    initiatedAt: v.number(),
    updatedAt: v.number(),
  }).index("by_tribe", ["myTribeId"]),

  // ── Federation Messages (content is encrypted ciphertext) ──
  federation_messages: defineTable({
    messageId: v.string(),
    channelId: v.string(),
    fromTribeId: v.string(),
    fromTribeName: v.string(),
    senderPub: v.string(),
    senderName: v.string(),
    type: v.union(v.literal("text"), v.literal("intel")),
    content: v.string(),
    sentAt: v.number(),
  }).index("by_channel", ["channelId", "sentAt"]),

  // ── Federation Trades ──
  federation_trades: defineTable({
    tradeId: v.string(),
    channelId: v.string(),
    fromTribeId: v.string(),
    toTribeId: v.string(),
    fromTribeName: v.string(),
    toTribeName: v.string(),
    offer: v.any(),
    request: v.any(),
    message: v.string(),
    proposedBy: v.string(),
    proposedAt: v.number(),
    status: v.string(),
    respondedAt: v.optional(v.number()),
    respondedBy: v.optional(v.string()),
    counterOffer: v.optional(v.any()),
    lastRespondedByTribeId: v.optional(v.string()),
    fromFulfilled: v.optional(v.boolean()),
    toFulfilled: v.optional(v.boolean()),
  }).index("by_channel", ["channelId"]),

  // ── Push Subscriptions ──
  push_subscriptions: defineTable({
    tribeId: v.string(),
    memberPub: v.string(),
    subscription: v.any(),
  })
    .index("by_tribe", ["tribeId"])
    .index("by_tribe_member", ["tribeId", "memberPub"]),
});
