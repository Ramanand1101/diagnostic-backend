const twilio = require('twilio');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

// ── SMS via AWS SNS (uses existing AWS credentials) ───────────────────────────
const snsClient = new SNSClient({
  region: process.env.AWS_SNS_REGION || 'ap-south-1', // Mumbai for India
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ── WhatsApp via Twilio sandbox (free) ────────────────────────────────────────
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;
const FROM_WA = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

function formatIndian(mobile) {
  const digits = String(mobile).replace(/\D/g, '').replace(/^91/, '');
  return `+91${digits}`;
}

async function sendSms({ to, message }) {
  const command = new PublishCommand({
    Message: message,
    PhoneNumber: formatIndian(to),
    MessageAttributes: {
      'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
      'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: 'DiagHub' },
    },
  });
  return snsClient.send(command);
}

async function sendWhatsapp({ to, message }) {
  if (!twilioClient) throw new Error('WhatsApp not configured. Add TWILIO_ACCOUNT_SID & TWILIO_AUTH_TOKEN to .env');
  return twilioClient.messages.create({
    body: message,
    from: FROM_WA,
    to: `whatsapp:${formatIndian(to)}`,
  });
}

module.exports = { sendSms, sendWhatsapp };
