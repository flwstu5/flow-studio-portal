// Minimal client-side CSV builder + downloader — no dependency needed.
// Handles quoting fields that contain commas, quotes, or newlines.

export function toCsv(rows, columns) {
  const escape = (val) => {
    const str = val === null || val === undefined ? "" : String(val);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((c) => escape(c.label)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => escape(typeof c.value === "function" ? c.value(row) : row[c.key]))
      .join(",")
  );

  return [header, ...lines].join("\n");
}

export function downloadCsv(filename, csvString) {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
