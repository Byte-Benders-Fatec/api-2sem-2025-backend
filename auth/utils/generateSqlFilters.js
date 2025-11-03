const generateSqlFilters = (filters) => {
    const keys = Object.keys(filters);
    if (keys.length === 0) return '';
  
    const conditions = keys.map(key => `${key} = ?`).join(' AND ');
    const values = keys.map(key => filters[key]);
  
    return { where: `WHERE ${conditions}`, values };
};
  
module.exports = { generateSqlFilters };