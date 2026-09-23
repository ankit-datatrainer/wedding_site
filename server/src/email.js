// Email notification service for EverAfter.
// Sends confirmation notifications to parents when family contact emails
// (Father's Email or Mother's Email) are provided during registration or
// profile updates.
//
// With SMTP_HOST set, mail really goes out through nodemailer. Without it the
// message is printed to the API console and recorded with status 'logged',
// so development never needs a mail server. Every attempt lands in the email
// log the admin panel shows, including failures and why.

import nodemailer from 'nodemailer';
import { config } from './config.js';
import { addEmailLog } from './store.js';

const transporter = config.smtp.enabled
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

const isEmail = (v) => /^\S+@\S+\.\S+$/.test(String(v || '').trim());

/**
 * Sends a confirmation notification email to a parent (Father or Mother).
 * Resolves to `{ relation, email, status, sentAt }` — never rejects, because
 * a mail failure must not fail the registration that triggered it.
 */
export async function sendParentNotificationEmail({
  recipientEmail,
  relation = 'Parent',
  childName = 'Your Child',
  userEmail = '',
}) {
  if (!isEmail(recipientEmail)) return null;

  const to = recipientEmail.trim();
  const sentAt = new Date().toISOString();
  const subject = `EverAfter Matrimonial: Account Confirmation for ${childName}`;
  const message = [
    `Dear ${relation},`,
    '',
    `We are writing to inform you that your child, ${childName}, has registered an account on EverAfter Matrimonial Platform with the email address ${userEmail}.`,
    '',
    'At EverAfter, we believe marriage joins two families rather than just two individuals. We notify parents from day one to ensure full transparency, authenticity, and family involvement.',
    '',
    'If you did not expect this email, or have any questions, please reach out to us anytime at support@everafter.com.',
    '',
    'Warm regards,',
    'EverAfter Family Relations Team',
  ].join('\n');

  let status = 'logged';
  let error = null;

  if (transporter) {
    try {
      await transporter.sendMail({ from: config.smtp.from, to, subject, text: message });
      status = 'sent';
    } catch (err) {
      status = 'failed';
      error = err.message;
      console.error(`[email] could not send to ${to}: ${err.message}`);
    }
  } else {
    console.log('\n================== EVERAFTER EMAIL (not sent: SMTP_HOST unset) ==================');
    console.log(`To: ${to} (${relation})\nSubject: ${subject}\n`);
    console.log(message);
    console.log('==================================================================================\n');
  }

  const entry = {
    id: `email_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    to_email: to,
    relation,
    child_name: childName,
    user_email: userEmail,
    subject,
    status,
    error,
    sent_at: sentAt,
  };
  try {
    await addEmailLog(entry);
  } catch (logErr) {
    console.error('[email] could not record email log:', logErr.message);
  }

  return { relation, email: to, status, sentAt };
}
