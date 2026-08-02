const Booking = require('../models/Booking');
const Product = require('../models/Product');

// Booking-time lab-price snapshots are normally frozen (see
// bookingController#createBooking) — but a booking placed BEFORE the admin ever set a
// Lab Sale Price on the product would otherwise be stuck with labPrice: null forever,
// permanently ineligible for settlement. This is the one deliberate exception: whenever
// a product's Lab Sale Price is created/changed, re-snapshot it onto every booking for
// that product that hasn't been settled yet (settled bookings stay frozen — correcting
// a price later must never rewrite a payout that's already been paid out).
async function recomputeLabPayableForProduct(productId) {
  const product = await Product.findById(productId).select('labPrice');
  if (!product) return;
  const newLabPrice = product.labPrice != null ? Number(product.labPrice) : null;

  const bookings = await Booking.find({ 'items.product': productId, settlementStatus: 'unsettled' });

  for (const booking of bookings) {
    let changed = false;
    booking.items.forEach((item) => {
      if (String(item.product) === String(productId) && item.labPrice !== newLabPrice) {
        item.labPrice = newLabPrice;
        changed = true;
      }
    });
    if (!changed) continue;

    const knownLabItems = booking.items.filter((i) => i.labPrice != null);
    booking.labPayable = knownLabItems.length
      ? knownLabItems.reduce((sum, i) => sum + i.labPrice * i.qty, 0)
      : null;
    booking.adminProfit = booking.labPayable != null ? booking.total - booking.labPayable : null;
    // validateModifiedOnly: only re-validate the fields actually touched above — a
    // plain .save() re-validates the WHOLE document, including unrelated required
    // fields (e.g. `patient`) that older legacy bookings may be missing, which would
    // otherwise fail this save (and, since this runs inside a product update, the
    // whole product save) over a field this function never touches.
    await booking.save({ validateModifiedOnly: true });
  }
}

module.exports = { recomputeLabPayableForProduct };
