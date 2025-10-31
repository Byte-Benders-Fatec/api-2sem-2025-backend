const getDateOnly = (dateInput) => {
  if (typeof dateInput === 'string') {
    return dateInput.split('T')[0];
  }
  if (dateInput instanceof Date) {
    return dateInput.toISOString().split('T')[0];
  }
  throw new Error("Formato inválido: esperado uma string de data ou objeto Date.");
};

const formatDate = (dateInput) => {
  let dateStr;

  if (typeof dateInput === 'string') {
    dateStr = dateInput.split('T')[0];
  } else if (dateInput instanceof Date) {
    dateStr = dateInput.toISOString().split('T')[0];
  } else {
    throw new Error("Formato inválido: esperado uma string de data ou objeto Date.");
  }

  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

module.exports = { formatDate, getDateOnly };
