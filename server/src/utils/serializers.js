// True for objects produced by .populate() on lean queries (plain objects).
const isPopulated = (value) => Boolean(value) && Object.getPrototypeOf(value) === Object.prototype;

export function publicUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name ?? '',
    studentNumber: user.studentNumber ?? '',
    role: user.role,
    isSuperAdmin: Boolean(user.isSuperAdmin),
    profileComplete: Boolean(user.name && user.studentNumber),
  };
}

// Use with lean queries that populate reportedBy.
export function serializeItem(item, { reporterVisible = false, viewerId = null } = {}) {
  const reporter = isPopulated(item.reportedBy) ? item.reportedBy : null;
  const reporterId = String(reporter?._id ?? '');

  const data = {
    id: String(item._id),
    title: item.title,
    description: item.description,
    category: item.category,
    type: item.type,
    location: item.location,
    locationDetail: item.locationDetail ?? '',
    dateOccurred: item.dateOccurred ?? null,
    dateReported: item.dateReported,
    image: item.image,
    status: item.status,
    archivedAt: item.archivedAt ?? null,
    createdAt: item.createdAt,
    isOwner: viewerId !== null && viewerId === reporterId,
  };

  // Name and student number are only sent to admins, the reporter, or an approved claimant.
  if (reporterVisible && reporter) {
    data.reporter = { name: reporter.name ?? '', studentNumber: reporter.studentNumber ?? '' };
  }
  return data;
}

export function serializeClaim(claim, { includeClaimant = false } = {}) {
  const data = {
    id: String(claim._id),
    status: claim.status,
    proofDescription: claim.proofDescription,
    createdAt: claim.createdAt,
    reviewedAt: claim.reviewedAt ?? null,
  };

  if (isPopulated(claim.item)) {
    data.item = {
      id: String(claim.item._id),
      title: claim.item.title,
      type: claim.item.type,
      status: claim.item.status,
      location: claim.item.location,
      image: claim.item.image,
    };
  } else {
    data.itemId = claim.item ? String(claim.item) : null;
  }

  if (includeClaimant && isPopulated(claim.claimant)) {
    data.claimant = {
      name: claim.claimant.name ?? '',
      studentNumber: claim.claimant.studentNumber ?? '',
      email: claim.claimant.email,
    };
  }
  return data;
}
