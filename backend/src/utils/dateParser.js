const MONTHS_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

function parseDate(dateStr) {
  if (!dateStr) return { parsedDate: null, isAmbiguous: false, isNonStandard: false, error: true };
  
  const cleaned = dateStr.trim();
  
  // Pattern 1: DD-MM-YYYY or DD/MM/YYYY
  const standardMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (standardMatch) {
    const p1 = parseInt(standardMatch[1], 10);
    const p2 = parseInt(standardMatch[2], 10);
    const year = standardMatch[3];
    
    // Check ambiguity (if both day and month are <= 12, e.g. 04-05-2026)
    const isAmbiguous = (p1 <= 12 && p2 <= 12 && p1 !== p2);
    
    // Default to DD-MM-YYYY (so p1 is day, p2 is month)
    // If p1 > 12, then it must be DD-MM-YYYY (p1 = day, p2 = month)
    // If p2 > 12, then it must be MM-DD-YYYY (p1 = month, p2 = day)
    let day = p1;
    let month = p2;
    if (p2 > 12 && p1 <= 12) {
      day = p2;
      month = p1;
    }
    
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    
    return {
      parsedDate: `${year}-${monthStr}-${dayStr}`,
      isAmbiguous,
      isNonStandard: false,
      error: false
    };
  }
  
  // Pattern 2: MMM-DD or DD-MMM (e.g. Mar-14, 14-Mar, Mar-14)
  const alphaMatch1 = cleaned.match(/^([a-zA-Z]{3})[-/](\d{1,2})$/);
  const alphaMatch2 = cleaned.match(/^(\d{1,2})[-/]([a-zA-Z]{3})$/);
  
  if (alphaMatch1 || alphaMatch2) {
    let monthAbbr, day;
    if (alphaMatch1) {
      monthAbbr = alphaMatch1[1].toLowerCase();
      day = parseInt(alphaMatch1[2], 10);
    } else {
      monthAbbr = alphaMatch2[2].toLowerCase();
      day = parseInt(alphaMatch2[1], 10);
    }
    
    const monthStr = MONTHS_MAP[monthAbbr];
    if (monthStr && day >= 1 && day <= 31) {
      const dayStr = String(day).padStart(2, '0');
      // Infer year 2026 based on context
      return {
        parsedDate: `2026-${monthStr}-${dayStr}`,
        isAmbiguous: false,
        isNonStandard: true,
        error: false
      };
    }
  }

  // Fallback to JS Date parsing
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const monthStr = String(parsed.getMonth() + 1).padStart(2, '0');
    const dayStr = String(parsed.getDate()).padStart(2, '0');
    return {
      parsedDate: `${year}-${monthStr}-${dayStr}`,
      isAmbiguous: false,
      isNonStandard: true,
      error: false
    };
  }

  return { parsedDate: null, isAmbiguous: false, isNonStandard: false, error: true };
}

module.exports = { parseDate };
