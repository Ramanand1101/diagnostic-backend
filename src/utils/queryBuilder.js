module.exports = function buildSearchQuery(base = {}, q) {
  if (!q) return base;
  const query = { ...base };
  query.$or = [
    { name: new RegExp(q, 'i') },
    { title: new RegExp(q, 'i') },
    { city: new RegExp(q, 'i') },
    { categoryName: new RegExp(q, 'i') }
  ];
  return query;
};
