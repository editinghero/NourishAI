// Split massive multi-day chat exports into reasonable AI chunks at day boundaries.
const DAY_HEADER =
  /(\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}\b|\b\d{1,2}\s*(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?\b|\bDay\s*\d+\b|\b\d{4}-\d{2}-\d{2}\b|\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b)/i;

export function splitMultiDay(
  text: string,
  targetChunkChars = 18000,
): string[] {
  if (text.length <= targetChunkChars) return [text];
  const lines = text.split(/\r?\n/);
  const boundaries: number[] = [0];
  for (let i = 1; i < lines.length; i++) {
    if (DAY_HEADER.test(lines[i])) boundaries.push(i);
  }
  if (boundaries.length < 2) {
    const out: string[] = [];
    for (let i = 0; i < text.length; i += targetChunkChars)
      out.push(text.slice(i, i + targetChunkChars));
    return out;
  }
  boundaries.push(lines.length);
  const sections: string[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    sections.push(lines.slice(boundaries[i], boundaries[i + 1]).join("\n"));
  }
  const merged: string[] = [];
  let cur = "";
  for (const s of sections) {
    if (!cur) {
      cur = s;
      continue;
    }
    if (cur.length + s.length < targetChunkChars) cur += "\n" + s;
    else {
      merged.push(cur);
      cur = s;
    }
  }
  if (cur) merged.push(cur);
  return merged;
}
