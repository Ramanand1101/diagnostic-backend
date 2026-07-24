const Corporate = require('../models/Corporate');
const User = require('../models/User');
const { sendMail } = require('../config/email');

async function notifyAgreementExpiry(corporate, daysLeft) {
  const recipients = [corporate.email, corporate.hr?.email].filter(Boolean);

  let adminEmails = [];
  if (corporate.relationshipManager) {
    const rm = await User.findById(corporate.relationshipManager).select('email');
    if (rm?.email) adminEmails.push(rm.email);
  }
  if (!adminEmails.length) {
    const superadmins = await User.find({ role: 'superadmin' }).select('email');
    adminEmails = superadmins.map((u) => u.email).filter(Boolean);
  }

  const expiryStr = corporate.agreementExpiryDate ? new Date(corporate.agreementExpiryDate).toDateString() : '';
  const subject = `Agreement expiring in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — ${corporate.companyName}`;
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
      <h2 style="color:#b45309">Agreement Expiry Reminder</h2>
      <p><strong>${corporate.companyName}</strong>'s agreement with HealthOnTime expires on <strong>${expiryStr}</strong> (${daysLeft} day${daysLeft === 1 ? '' : 's'} from now).</p>
      <p>Please renew or take appropriate action before the agreement lapses.</p>
    </div>`;

  const allRecipients = [...new Set([...recipients, ...adminEmails])];
  await Promise.allSettled(allRecipients.map((to) => sendMail({ to, subject, html })));
}

// Runs daily: sends a one-time reminder per threshold once the corporate's
// agreement crosses into that window, tracked via agreementReminder{60,30}SentAt
// so it never fires twice for the same expiry cycle.
async function checkAgreementReminders() {
  const now = new Date();
  const corporates = await Corporate.find({
    active: true,
    agreementExpiryDate: { $exists: true, $ne: null },
  });

  for (const corporate of corporates) {
    const daysLeft = Math.ceil((corporate.agreementExpiryDate - now) / (1000 * 60 * 60 * 24));
    const thresholds = corporate.settings?.reminderDaysBefore?.length ? corporate.settings.reminderDaysBefore : [60, 30];

    try {
      if (thresholds.includes(60) && daysLeft <= 60 && daysLeft > 30 && !corporate.agreementReminder60SentAt) {
        await notifyAgreementExpiry(corporate, daysLeft);
        corporate.agreementReminder60SentAt = now;
        await corporate.save();
      }
      if (thresholds.includes(30) && daysLeft <= 30 && daysLeft >= 0 && !corporate.agreementReminder30SentAt) {
        await notifyAgreementExpiry(corporate, daysLeft);
        corporate.agreementReminder30SentAt = now;
        await corporate.save();
      }
    } catch (err) {
      console.error(`[AgreementReminder] failed for corporate ${corporate._id}:`, err.message);
    }
  }
}

module.exports = { checkAgreementReminders };
