module.exports = function paginate(query, { page = 1, limit = 12 }) {
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.max(parseInt(limit, 10) || 12, 1);
  const skip = (currentPage - 1) * pageSize;
  return query.skip(skip).limit(pageSize);
};
