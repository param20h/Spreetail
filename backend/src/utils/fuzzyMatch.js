function levenshtein(a, b) {
  const tmp = [];
  let i, j, alen = a.length, blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;
  for (i = 0; i <= alen; i++) tmp[i] = [i];
  for (j = 0; j <= blen; j++) tmp[0][j] = j;
  for (i = 1; i <= alen; i++) {
    for (j = 1; j <= blen; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[alen][blen];
}

function findFuzzyMatch(targetName, candidates) {
  if (!targetName) return null;
  const targetLower = targetName.trim().toLowerCase();
  
  // Exact match (case insensitive)
  for (const candidate of candidates) {
    if (candidate.toLowerCase() === targetLower) {
      return candidate;
    }
  }

  // Starts with or contains check
  for (const candidate of candidates) {
    const candLower = candidate.toLowerCase();
    if (targetLower.startsWith(candLower) || candLower.startsWith(targetLower)) {
      return candidate;
    }
  }

  // Levenshtein distance matching with length-aware thresholds
  let bestMatch = null;
  let minDistance = Infinity;
  const maxAllowedDistance = targetLower.length <= 4 ? 1 : 2;

  for (const candidate of candidates) {
    const candLower = candidate.toLowerCase();
    const distance = levenshtein(targetLower, candLower);
    if (distance <= maxAllowedDistance && distance < minDistance) {
      minDistance = distance;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

module.exports = { findFuzzyMatch };
