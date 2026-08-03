const Booking = require('../models/Booking');
const User = require('../models/User');
const { queueEmail } = require('../queues/index');
const { sendSms, sendWhatsapp } = require('../config/sms');
const { WARNING_MESSAGES, computeBookingWarnings } = require('./bookingWarnings');

// Sends the "Booking Confirmed" email + SMS/WhatsApp for a booking that is actually
// paid. Extracted out of bookingController#createBooking so it can be called from two
// places: immediately at creation for non-online payment methods, and from
// paymentController#verifyPayment once an online booking's payment is signature-verified
// (an online booking must NOT get this message at creation time — it isn't paid yet).
// Fire-and-forget from both call sites, same as the original inline IIFE.
async function sendBookingConfirmation(bookingId) {
  try {
    const booking = await Booking.findById(bookingId).populate('lab', 'name address city phone publicPhone');
    if (!booking) return;
    const lab = booking.lab;

    const userRecord = booking.user
      ? await User.findById(booking.user).select('name email mobile').lean()
      : null;

    const toEmail = userRecord?.email || booking.guest?.email;
    const toMobile = userRecord?.mobile || booking.guest?.mobile;
    const warnings = computeBookingWarnings({ slotDate: booking.slotDate, slotTime: booking.slotTime });
    const warningTexts = warnings.map((w) => WARNING_MESSAGES[w]).filter(Boolean);

    if (toEmail) {
      try {
        const itemsHtml = booking.items.map((i) =>
          `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${i.name}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right">₹${i.price}</td></tr>`
        ).join('');
        const labAddress = lab ? [lab.address, lab.city].filter(Boolean).join(', ') : '';
        await queueEmail({
          to: toEmail,
          subject: `Booking Confirmed – ${booking.bookingNo}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
              <div style="background:#0ea5e9;padding:24px 32px;border-radius:12px 12px 0 0">
                <h1 style="color:#fff;margin:0;font-size:20px">Booking Confirmed ✓</h1>
                <p style="color:#bae6fd;margin:4px 0 0;font-size:14px">Booking ID: <strong>${booking.bookingNo}</strong></p>
              </div>
              <div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:none">
                <p style="margin:0 0 16px">Hi <strong>${userRecord?.name || 'there'}</strong>,<br>Your lab test booking has been confirmed.</p>
                ${lab ? `<div style="background:#f8fafc;border-radius:8px;padding:14px 16px;margin-bottom:16px">
                  <p style="margin:0;font-weight:600;font-size:15px">${lab.name}</p>
                  ${labAddress ? `<p style="margin:4px 0 0;color:#64748b;font-size:13px">📍 ${labAddress}</p>` : ''}
                  ${(lab.publicPhone || lab.phone) ? `<p style="margin:4px 0 0;color:#64748b;font-size:13px">📞 ${lab.publicPhone || lab.phone}</p>` : ''}
                </div>` : ''}
                <p style="margin:0 0 6px;font-weight:600">Appointment</p>
                <p style="margin:0 0 16px;color:#475569;font-size:14px">
                  📅 ${booking.slotDate ? new Date(booking.slotDate).toDateString() : 'To be confirmed'}
                  ${booking.slotTime ? ` at ${booking.slotTime}` : ''}<br>
                  🏠 Visit type: ${booking.visitType === 'home' ? 'Home Collection' : 'Visit Lab'}
                </p>
                <table style="width:100%;border-collapse:collapse;font-size:14px">
                  <thead><tr style="background:#f8fafc">
                    <th style="padding:8px 12px;text-align:left;font-weight:600">Test</th>
                    <th style="padding:8px 12px;text-align:right;font-weight:600">Price</th>
                  </tr></thead>
                  <tbody>${itemsHtml}</tbody>
                </table>
                ${booking.discount > 0 ? `<p style="text-align:right;margin:8px 0 4px;font-size:13px;color:#16a34a">Discount: –₹${booking.discount}</p>` : ''}
                <p style="text-align:right;margin:8px 0 0;font-weight:700;font-size:16px;color:#0ea5e9">Total: ₹${booking.total}</p>
                ${warnings.includes('lateNight') ? `
                <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin-top:16px">
                  <p style="margin:0;font-size:13px;color:#92400e">🌙 ${WARNING_MESSAGES.lateNight}</p>
                </div>` : ''}
                ${warnings.includes('shortNotice') ? `
                <div style="background:#fef2f2;border:1px solid #f87171;border-radius:8px;padding:12px 16px;margin-top:12px">
                  <p style="margin:0;font-size:13px;color:#991b1b">⏰ ${WARNING_MESSAGES.shortNotice}</p>
                </div>` : ''}
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
                <p style="font-size:12px;color:#94a3b8;margin:0">If you have any questions, reply to this email or call the lab directly.</p>
              </div>
            </div>`,
        });
      } catch (emailErr) {
        console.error('[Booking] email queue failed:', emailErr.message);
      }
    }

    if (toMobile) {
      const dateStr = booking.slotDate ? new Date(booking.slotDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      const baseLine = `Booking Confirmed! ID ${booking.bookingNo} at ${lab?.name || 'the lab'}${dateStr ? ` on ${dateStr}` : ''}${booking.slotTime ? ` at ${booking.slotTime}` : ''}. Total: Rs.${booking.total}.`;
      const fullMessage = [baseLine, ...warningTexts].join(' ');

      try {
        await sendSms({ to: toMobile, message: fullMessage });
      } catch (smsErr) {
        console.error('[Booking] SMS failed:', smsErr.message);
      }
      try {
        await sendWhatsapp({ to: toMobile, message: fullMessage });
      } catch (waErr) {
        console.error('[Booking] WhatsApp failed:', waErr.message);
      }
    }
  } catch (err) {
    console.error('[Booking] sendBookingConfirmation failed:', err.message);
  }
}

module.exports = { sendBookingConfirmation };
