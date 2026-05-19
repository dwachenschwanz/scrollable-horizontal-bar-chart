function slugifyDatasetName(name, index) {
  const slug = String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `dataset-${index + 1}`;
}

function getUniqueDatasetKey(name, index, usedKeys) {
  const baseKey = slugifyDatasetName(name, index);
  let key = baseKey;
  let suffix = 2;

  while (usedKeys.has(key)) {
    key = `${baseKey}-${suffix}`;
    suffix += 1;
  }

  usedKeys.add(key);
  return key;
}

function parseValue(row, headerKey) {
  const rawValue = row?.y ?? row?.[headerKey];
  const value = Number.parseFloat(rawValue);
  return Number.isFinite(value) ? value : 0;
}

export function extractCompareValueDatasets(source) {
  const datasets = source?.data?.data?.data;

  if (!Array.isArray(datasets)) {
    return [];
  }

  const usedKeys = new Set();

  return datasets
    .map((dataset, index) => {
      const rows = Array.isArray(dataset?.mainRows) ? dataset.mainRows : [];
      const headerKey = dataset?.headerMap?.[0]?.key;

      return {
        categories: rows.map((row) => String(row?.name ?? "")),
        data: rows.map((row) => parseValue(row, headerKey)),
        key: getUniqueDatasetKey(dataset?.name, index, usedKeys),
        name: String(dataset?.name ?? `Dataset ${index + 1}`).trim(),
      };
    })
    .filter((dataset) => dataset.data.length > 0);
}
