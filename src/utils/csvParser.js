function parseCSV(buffer) {
  const text = buffer.toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line) => {
    const result = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s_-]+/g, ''));
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    return headers.reduce((obj, h, i) => { obj[h] = (values[i] || '').trim(); return obj; }, {});
  });

  return { headers, rows };
}

// Parses an uploaded CSV or XLSX file into normalized lowercase-keyed row objects.
// `file` is a multer file object (needs .buffer and .originalname/.mimetype).
function parseSpreadsheet(file) {
  const isXlsx = file.originalname?.toLowerCase().endsWith('.xlsx') ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (isXlsx) {
    const XLSX = require('xlsx');
    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }).map((r) => {
      const lower = {};
      for (const [k, v] of Object.entries(r)) lower[k.toLowerCase().replace(/[\s_-]+/g, '')] = String(v ?? '').trim();
      return lower;
    });
    return { rows };
  }
  return parseCSV(file.buffer);
}

module.exports = { parseCSV, parseSpreadsheet };
