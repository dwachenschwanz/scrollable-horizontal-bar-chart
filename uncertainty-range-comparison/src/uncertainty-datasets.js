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

export function extractCompareUncertaintyDatasets(source) {
  const datasets = source?.data?.data?.data;

  if (!Array.isArray(datasets)) {
    return [];
  }

  const usedKeys = new Set();

  return datasets
    .map((dataset, index) => {
      const rows = Array.isArray(dataset?.mainRows) ? dataset.mainRows : [];
      return {
        key: getUniqueDatasetKey(dataset?.name, index, usedKeys),
        name: String(dataset?.name ?? `Dataset ${index + 1}`).trim(),
        rows: rows.map((row) => ({
          base: row?.base,
          high: row?.high,
          low: row?.low,
          name: row?.name ?? "",
        })),
      };
    })
    .filter((dataset) => dataset.rows.length > 0);
}
