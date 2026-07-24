// Shared warning messages for late-night and short-notice bookings.
// Kept in one place so email / SMS / WhatsApp / screen all show identical wording.
// TODO (future): move these into an admin-configurable settings collection.
const WARNING_MESSAGES = {
  lateNight: 'Note: If the diagnostic center is closed or opens late, please cooperate. Please inform us, Our team will coordinate with the diagnostic center and update you if any schedule changes are required.',
  shortNotice: 'Please check with the diagnostic center/lab regarding appointment availability before visiting.',
};

// Computes which warnings apply to a booking, using the server's local timezone
// (so "9 PM" and "10 hours" always mean the same wall-clock time regardless of caller).
function computeBookingWarnings({ slotDate, slotTime }) {
  const warnings = [];
  if (!slotDate) return warnings;

  const now = new Date();
  const slotDay = new Date(slotDate); slotDay.setHours(0, 0, 0, 0);
  const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);

  // Booked after 9 PM for an appointment tomorrow
  if (now.getHours() >= 21 && slotDay.getTime() === tomorrow.getTime()) {
    warnings.push('lateNight');
  }

  // Appointment is within the next 10 hours
  if (slotTime) {
    const [h = 0, m = 0] = slotTime.split(':').map(Number);
    const apptDateTime = new Date(slotDate); apptDateTime.setHours(h, m, 0, 0);
    const hoursUntil = (apptDateTime - now) / 3600000;
    if (hoursUntil > 0 && hoursUntil <= 10) warnings.push('shortNotice');
  }

  return warnings;
}

module.exports = { WARNING_MESSAGES, computeBookingWarnings };
