/**
 * Reads ?page= and ?limit= safely. Limits are capped so nobody can ask for
 * the whole database in one request (keeps list endpoints fast: NFR2).
 */
function getPagination(query = {}, { defaultLimit = 12, maxLimit = 50 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function pageMeta(total, { page, limit }) {
  return { page, limit, total, pages: Math.ceil(total / limit) };
}

/** Escapes regex special characters so user search text is matched literally (no ReDoS). */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { getPagination, pageMeta, escapeRegex };
