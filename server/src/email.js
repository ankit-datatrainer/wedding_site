// Email notification service for EverAfter.
// Sends confirmation notifications to parents when family contact emails
// (Father's Email or Mother's Email) are provided during registration or profile updates.

export const emailLogs = [];

/**
 * Sends a confirmation notification email to a parent (Father or Mother).
 * Logs the email to the console and audit list.
 */
export async function sendParentNotificationEmail({
  recipientEmail,
  relation = 'Parent',
  childName = 'Your Child',
  userEmail = '',
}) {
  if (!recipientEmail || !/^\S+@\S+\.\S+$/.test(recipientEmail.trim())) {
    return false;
  }

  const timestamp = new Date().toISOString();
  const subject = `EverAfter Matrimonial: Account Confirmation for ${childName}`;
  const message = [
    `Dear ${relation},`,
    '',
    `We are writing to inform you that your child, ${childName}, has registered an account on EverAfter Matrimonial Platform with the email address ${userEmail}.`,
    '',
    'At EverAfter, we believe marriage joins two families rather than just two individuals. We notify parents from day one to ensure full transparency, authenticity, and family involvement.',
    '',
    'If you have any questions or would like to speak with one of our Senior Relationship Advisors, please reach out to us anytime at support@everafter.com.',
    '',
    'Warm regards,',
    'EverAfter Family Relations Team',
    'https://everafter.com',
  ].join('\n');

  const logEntry = {
    id: `email_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    to: recipientEmail.trim(),
    relation,
    childName,
    userEmail,
    subject,
    message,
    sentAt: timestamp,
    status: 'delivered',
  };

  emailLogs.push(logEntry);

  console.log('\n================== EVERAFTER EMAIL DISPATCH ==================');
  console.log(`[Email Sent] To: ${logEntry.to} (${relation})`);
  console.log(`Subject: ${subject}`);
  console.log(`Time: ${timestamp}`);
  console.log('--------------------------------------------------------------');
  console.log(message);
  console.log('==============================================================\n');

  return true;
}

export function getEmailLogs() {
  return [...emailLogs];
}
