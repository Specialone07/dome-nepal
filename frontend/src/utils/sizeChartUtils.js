// Size Chart Presets
const m = (...labels) => labels.map(l => ({ key: l.toLowerCase().replace(/\s+/g, '_'), label: l }))

// Each product type has its own measurements: a hoodie is measured differently from a jacket.
export const SIZE_CHART_PRESETS = {
  tee:      { label: 'T-shirt',  measurements: m('Chest', 'Length', 'Shoulder', 'Sleeve Length') },
  hoodie:   { label: 'Hoodie',   measurements: m('Chest', 'Length', 'Shoulder', 'Sleeve Length') },
  jacket:   { label: 'Jacket',   measurements: m('Chest', 'Length', 'Shoulder', 'Sleeve Length', 'Waist') },
  shirt:    { label: 'Shirt',    measurements: m('Chest', 'Length', 'Shoulder', 'Sleeve Length', 'Collar') },
  sweater:  { label: 'Sweater',  measurements: m('Chest', 'Length', 'Shoulder', 'Sleeve Length') },
  trousers: { label: 'Trousers', measurements: m('Waist', 'Hip', 'Thigh', 'Inseam', 'Length') },
  shorts:   { label: 'Shorts',   measurements: m('Waist', 'Hip', 'Inseam', 'Length') },
  dresses:  { label: 'Dress',    measurements: m('Bust', 'Waist', 'Hip', 'Length') },
  footwear: { label: 'Footwear', measurements: [{ key: 'foot_length', label: 'Foot Length' }, { key: 'width', label: 'Width' }] },
  tops:     { label: 'Tops',     measurements: m('Chest', 'Waist', 'Hip', 'Length') },
  bottoms:  { label: 'Bottoms',  measurements: m('Waist', 'Hip', 'Inseam', 'Length') },
};

const PRESET_BY_CATEGORY = { tops: 'tops', outerwear: 'jacket', activewear: 'tops', bottoms: 'trousers', dresses: 'dresses', footwear: 'footwear' };

// Picks the right chart type from the product name/category, e.g. "Zip Hoodie" -> hoodie.
export function guessPreset(name, category) {
  const n = String(name || '').toLowerCase();
  const rules = [
    [/hood(ie|y)|sweatshirt/, 'hoodie'],
    [/jacket|puffer|windbreaker|bomber|coat|parka|fleece|gilet|vest|blazer/, 'jacket'],
    [/sweater|pullover|cardigan|knit/, 'sweater'],
    [/t-?shirt|\btees?\b|tank/, 'tee'],
    [/shirt|polo/, 'shirt'],
    [/\bshorts\b|\bshort\b(?!\s*sleeve)/, 'shorts'],
    [/pant|trouser|jogger|jean|cargo|denim|chino|legging|track/, 'trousers'],
    [/dress|gown|skirt/, 'dresses'],
    [/shoe|sneaker|boot|sandal|slipper/, 'footwear'],
  ];
  for (const [re, preset] of rules) if (re.test(n)) return preset;
  return PRESET_BY_CATEGORY[category] || '';
}

export const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// Default size chart structure
export const DEFAULT_SIZE_CHART = {
  enabled: false,
  unit: 'in',
  preset: 'custom',
  measurements: [],
  rows: []
};

// Build empty size chart rows for given sizes
export function buildSizeChartRows(sizes, measurements) {
  return sizes.map(size => ({
    size,
    active: ['S', 'M', 'L', 'XL'].includes(size),
    values: measurements.reduce((acc, m) => ({ ...acc, [m.key]: '' }), {})
  }));
}

// Create measurement key from label
export function createMeasurementKey(label) {
  return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

// Validate measurement name (no duplicates, not empty)
export function validateMeasurementName(name, existingMeasurements) {
  const trimmed = name.trim();
  if (!trimmed) return { valid: false, error: 'Measurement name cannot be empty' };
  
  const key = createMeasurementKey(trimmed);
  const exists = existingMeasurements.some(m => 
    m.key === key || m.label.toLowerCase() === trimmed.toLowerCase()
  );
  
  if (exists) return { valid: false, error: 'Measurement already exists' };
  return { valid: true, key, label: trimmed };
}

// Validate size name (no duplicates, not empty)
export function validateSizeName(size, existingSizes) {
  const trimmed = size.trim();
  if (!trimmed) return { valid: false, error: 'Size cannot be empty' };
  
  const exists = existingSizes.some(s => {
    const existingSize = typeof s === 'string' ? s : s.size;
    return existingSize?.toLowerCase() === trimmed.toLowerCase();
  });
  if (exists) return { valid: false, error: 'Size already exists' };
  
  return { valid: true, size: trimmed };
}

// Apply preset to size chart
export function applyPreset(presetKey, currentSizeChart) {
  const preset = SIZE_CHART_PRESETS[presetKey];
  if (!preset) return currentSizeChart;

  const newMeasurements = preset.measurements;
  
  // Preserve existing values for matching keys
  const preservedValues = currentSizeChart.rows.map(row => {
    const preserved = {};
    newMeasurements.forEach(m => {
      const existingMeasurement = currentSizeChart.measurements.find(
        em => em.key === m.key || em.label.toLowerCase() === m.label.toLowerCase()
      );
      if (existingMeasurement) {
        preserved[m.key] = row.values[existingMeasurement.key] || '';
      }
    });
    return { ...row, values: preserved };
  });

  return {
    ...currentSizeChart,
    preset: presetKey,
    measurements: newMeasurements,
    rows: preservedValues
  };
}

// Normalize size chart data from API
export function normalizeSizeChartFromAPI(apiData) {
  if (!apiData) return { ...DEFAULT_SIZE_CHART };
  
  return {
    enabled: apiData.enabled || false,
    unit: apiData.unit || 'in',
    preset: apiData.preset || 'custom',
    image: apiData.image?.url ? { url: apiData.image.url, publicId: apiData.image.publicId || '' } : null,
    measurements: Array.isArray(apiData.measurements) ? apiData.measurements : [],
    rows: Array.isArray(apiData.rows) ? apiData.rows.map(row => ({
      size: row.size,
      active: true, // All loaded rows should be active
      values: row.values instanceof Map ? Object.fromEntries(row.values) : (row.values || {})
    })) : []
  };
}

// Prepare size chart for API submission
export function prepareSizeChartForAPI(sizeChart) {
  if (!sizeChart || !sizeChart.enabled) {
    return { enabled: false };
  }

  return {
    enabled: true,
    unit: sizeChart.unit || 'in',
    preset: sizeChart.preset || 'custom',
    measurements: sizeChart.measurements.filter(m => m.label).map(m => ({
      key: m.key || createMeasurementKey(m.label),
      label: m.label.trim()
    })),
    rows: sizeChart.rows
      .filter(row => row.active && row.size.trim())
      .map(row => ({
        size: row.size.trim(),
        values: row.values
      }))
  };
}

// Check if size chart has valid data
export function hasValidSizeChartData(sizeChart) {
  return !!(
    sizeChart &&
    sizeChart.enabled &&
    sizeChart.measurements &&
    sizeChart.measurements.length > 0 &&
    sizeChart.rows &&
    sizeChart.rows.some(r => r.active)
  );
}

// Get active rows from size chart
export function getActiveRows(sizeChart) {
  if (!sizeChart || !sizeChart.rows) return [];
  return sizeChart.rows.filter(r => r.active);
}

// Get measurement count
export function getMeasurementCount(sizeChart) {
  return sizeChart?.measurements?.length || 0;
}

// Get active size count
export function getActiveSizeCount(sizeChart) {
  return getActiveRows(sizeChart).length;
}
