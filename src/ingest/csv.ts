/**
 * CSV, RFC 4180 shape, with no dependency: quoted fields, doubled quotes, CRLF
 * or LF line ends, a header row. A roster export is small enough to parse in
 * memory; 300,000 rows of seventeen short fields is tens of megabytes.
 */

export const parseCsv = (text: string): readonly Readonly<Record<string, string>>[] => {
  const rows = parseRows(text.replace(/^﻿/, ''));
  if (rows.length === 0) return [];
  const [header, ...body] = rows;
  const names = header.map((h) => h.trim());
  return body
    .filter((cells) => cells.some((c) => c.trim() !== ''))
    .map((cells) => Object.fromEntries(names.map((name, i) => [name, cells[i] ?? ''])));
};

const parseRows = (text: string): readonly (readonly string[])[] => {
  const rows: string[][] = [];
  const row: string[] = [];
  const chars = [...text];
  const state = chars.reduce(
    (s, ch, i) => {
      const next = chars[i + 1];
      if (s.quoted) {
        // The second quote of an escaped pair is consumed first, or a run of
        // three quotes would re-enter the pair branch and never close the field.
        if (s.skip) return { ...s, skip: false };
        if (ch === '"' && next === '"') return { ...s, field: s.field + '"', skip: true };
        if (ch === '"') return { ...s, quoted: false };
        return { ...s, field: s.field + ch };
      }
      if (ch === '"' && s.field === '') return { ...s, quoted: true };
      if (ch === ',') {
        row.push(s.field);
        return { ...s, field: '' };
      }
      if (ch === '\r') return s;
      if (ch === '\n') {
        row.push(s.field);
        rows.push([...row]);
        row.length = 0;
        return { ...s, field: '' };
      }
      return { ...s, field: s.field + ch };
    },
    { field: '', quoted: false, skip: false }
  );
  if (state.field !== '' || row.length > 0) {
    row.push(state.field);
    rows.push([...row]);
  }
  return rows;
};

/** A one-line CSV writer for the round trip in tests and exports. */
export const toCsv = (records: readonly Readonly<Record<string, string>>[], columns: readonly string[]): string => {
  const cell = (v: string | undefined): string => {
    const s = v ?? '';
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(','), ...records.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\n');
};
