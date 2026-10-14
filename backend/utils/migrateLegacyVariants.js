const Product = require('../models/Product');

async function migrateLegacyVariants() {
  const cursor = Product.collection.find({ 'variants.sizes': { $exists: true } });
  const operations = [];
  for await (const product of cursor) {
    const variants = (product.variants || []).flatMap((group, groupIndex) =>
      (group.sizes || []).filter(entry => entry?.size).map((entry, sizeIndex) => ({
        size: String(entry.size).trim(),
        color: String(group.color || 'Default').trim(),
        colorHex: group.colorHex || '#000000',
        stock: Math.max(0, Number(entry.stock) || 0),
        sku: entry.sku || `MIGRATED-${product._id}-${groupIndex}-${sizeIndex}`
      }))
    );
    operations.push({ updateOne: { filter: { _id: product._id }, update: { $set: { variants } } } });
  }
  if (!operations.length) return 0;
  const result = await Product.collection.bulkWrite(operations, { ordered: false });
  return result.modifiedCount;
}

module.exports = migrateLegacyVariants;
