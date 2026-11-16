// Read env vars at runtime, not at module load time
function getTelegramConfig() {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_ADMIN_CHAT_ID,
  };
}

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode: 'HTML' | 'Markdown';
}

async function sendTelegramMessage(message: string): Promise<boolean> {
  const { botToken, chatId } = getTelegramConfig();
  
  if (!botToken || !chatId) {
    console.log('[Telegram] Bot token or chat ID not configured, skipping notification');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const payload: TelegramMessage = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Telegram] Failed to send message:', error);
      return false;
    }

    console.log('[Telegram] Message sent successfully');
    return true;
  } catch (error) {
    console.error('[Telegram] Error sending message:', error);
    return false;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false 
  });
}

export async function notifyNewUserRegistration(user: {
  id: number;
  email: string;
  phone?: string | null;
  username: string;
  createdAt?: Date | string;
  ipAddress?: string | null;
}): Promise<void> {
  const message = `
🆕 <b>NEW USER REGISTRATION</b>

👤 <b>User ID:</b> ${user.id}
📧 <b>Email:</b> ${escapeHtml(user.email)}
📱 <b>Phone:</b> ${user.phone || 'Not provided'}
👨 <b>Username:</b> ${escapeHtml(user.username)}
📅 <b>Registered:</b> ${formatDate(user.createdAt || new Date())}
🌐 <b>IP Address:</b> ${user.ipAddress || 'Not available'}
`;
  await sendTelegramMessage(message.trim());
}

export async function notifyDepositSubmitted(data: {
  userId: number;
  userEmail: string;
  userPhone?: string | null;
  amount: string;
  cryptocurrency: string;
  network: string;
  txid?: string | null;
  walletAddress?: string | null;
  status: string;
}): Promise<void> {
  const message = `
💰 <b>NEW DEPOSIT SUBMITTED</b>

👤 <b>User ID:</b> ${data.userId}
📧 <b>Email:</b> ${escapeHtml(data.userEmail)}
📱 <b>Phone:</b> ${data.userPhone || 'Not provided'}

💵 <b>Amount:</b> ${data.amount} ${data.cryptocurrency}
🔗 <b>Network:</b> ${data.network}
🔑 <b>TXID:</b> ${data.txid ? escapeHtml(data.txid) : 'Manual upload'}
📥 <b>Wallet:</b> ${data.walletAddress ? escapeHtml(data.walletAddress) : 'N/A'}
📊 <b>Status:</b> ${data.status}
📅 <b>Time:</b> ${formatDate(new Date())}
`;
  await sendTelegramMessage(message.trim());
}

export async function notifyDepositAutoConfirmed(data: {
  userId: number;
  userEmail: string;
  userPhone?: string | null;
  amount: string;
  cryptocurrency: string;
  network: string;
  txid: string;
  walletAddress?: string | null;
  confirmations: number;
}): Promise<void> {
  const message = `
✅ <b>DEPOSIT AUTO-CONFIRMED</b>

👤 <b>User ID:</b> ${data.userId}
📧 <b>Email:</b> ${escapeHtml(data.userEmail)}
📱 <b>Phone:</b> ${data.userPhone || 'Not provided'}

💵 <b>Amount:</b> ${data.amount} ${data.cryptocurrency}
🔗 <b>Network:</b> ${data.network}
🔑 <b>TXID:</b> ${escapeHtml(data.txid)}
📥 <b>Wallet:</b> ${data.walletAddress ? escapeHtml(data.walletAddress) : 'N/A'}
🔢 <b>Confirmations:</b> ${data.confirmations}
📅 <b>Time:</b> ${formatDate(new Date())}
`;
  await sendTelegramMessage(message.trim());
}

export async function notifyDepositManuallyConfirmed(data: {
  userId: number;
  userEmail: string;
  userPhone?: string | null;
  amount: string;
  cryptocurrency: string;
  network: string;
  txid?: string | null;
  adminNote?: string | null;
}): Promise<void> {
  const message = `
✅ <b>DEPOSIT MANUALLY CONFIRMED</b>

👤 <b>User ID:</b> ${data.userId}
📧 <b>Email:</b> ${escapeHtml(data.userEmail)}
📱 <b>Phone:</b> ${data.userPhone || 'Not provided'}

💵 <b>Amount:</b> ${data.amount} ${data.cryptocurrency}
🔗 <b>Network:</b> ${data.network}
🔑 <b>TXID:</b> ${data.txid ? escapeHtml(data.txid) : 'Manual upload'}
📝 <b>Admin Note:</b> ${data.adminNote || 'None'}
📅 <b>Time:</b> ${formatDate(new Date())}
`;
  await sendTelegramMessage(message.trim());
}

export async function notifyDepositRejected(data: {
  userId: number;
  userEmail: string;
  userPhone?: string | null;
  amount: string;
  cryptocurrency: string;
  network: string;
  txid?: string | null;
  reason?: string | null;
}): Promise<void> {
  const message = `
❌ <b>DEPOSIT REJECTED</b>

👤 <b>User ID:</b> ${data.userId}
📧 <b>Email:</b> ${escapeHtml(data.userEmail)}
📱 <b>Phone:</b> ${data.userPhone || 'Not provided'}

💵 <b>Amount:</b> ${data.amount} ${data.cryptocurrency}
🔗 <b>Network:</b> ${data.network}
🔑 <b>TXID:</b> ${data.txid ? escapeHtml(data.txid) : 'Manual upload'}
⚠️ <b>Reason:</b> ${data.reason || 'Not specified'}
📅 <b>Time:</b> ${formatDate(new Date())}
`;
  await sendTelegramMessage(message.trim());
}

export async function notifyWithdrawalRequest(data: {
  userId: number;
  userEmail: string;
  userPhone?: string | null;
  amount: string;
  cryptocurrency: string;
  network: string;
  destinationAddress: string;
  currentBalance: string;
}): Promise<void> {
  const message = `
🏦 <b>NEW WITHDRAWAL REQUEST</b>

👤 <b>User ID:</b> ${data.userId}
📧 <b>Email:</b> ${escapeHtml(data.userEmail)}
📱 <b>Phone:</b> ${data.userPhone || 'Not provided'}

💵 <b>Amount:</b> ${data.amount} ${data.cryptocurrency}
🔗 <b>Network:</b> ${data.network}
📤 <b>Destination:</b> ${escapeHtml(data.destinationAddress)}
💰 <b>Current Balance:</b> $${data.currentBalance}
📊 <b>Status:</b> Pending
📅 <b>Time:</b> ${formatDate(new Date())}
`;
  await sendTelegramMessage(message.trim());
}

export async function notifyWithdrawalStatusChange(data: {
  userId: number;
  userEmail: string;
  userPhone?: string | null;
  amount: string;
  cryptocurrency: string;
  network: string;
  destinationAddress: string;
  status: 'approved' | 'rejected' | 'sent' | 'failed';
  txHash?: string | null;
  reason?: string | null;
}): Promise<void> {
  const statusEmoji = {
    approved: '✅',
    rejected: '❌',
    sent: '📤',
    failed: '⚠️'
  };

  const statusText = {
    approved: 'APPROVED',
    rejected: 'REJECTED',
    sent: 'SUCCESSFULLY SENT',
    failed: 'FAILED'
  };

  const message = `
${statusEmoji[data.status]} <b>WITHDRAWAL ${statusText[data.status]}</b>

👤 <b>User ID:</b> ${data.userId}
📧 <b>Email:</b> ${escapeHtml(data.userEmail)}
📱 <b>Phone:</b> ${data.userPhone || 'Not provided'}

💵 <b>Amount:</b> ${data.amount} ${data.cryptocurrency}
🔗 <b>Network:</b> ${data.network}
📤 <b>Destination:</b> ${escapeHtml(data.destinationAddress)}
${data.txHash ? `🔑 <b>TX Hash:</b> ${escapeHtml(data.txHash)}` : ''}
${data.reason ? `📝 <b>Reason:</b> ${data.reason}` : ''}
📅 <b>Time:</b> ${formatDate(new Date())}
`;
  await sendTelegramMessage(message.trim());
}

export async function notifyTradeExecuted(data: {
  userId: number;
  userEmail: string;
  tradeType: string;
  tradingPair: string;
  amount: string;
  entryPrice: string;
  exitPrice?: string | null;
  result: 'win' | 'loss';
  pnl: string;
  duration: string;
}): Promise<void> {
  const resultEmoji = data.result === 'win' ? '🟢' : '🔴';
  const resultText = data.result === 'win' ? 'PROFIT' : 'LOSS';

  const message = `
📈 <b>TRADE EXECUTED</b>

👤 <b>User ID:</b> ${data.userId}
📧 <b>Email:</b> ${escapeHtml(data.userEmail)}

📊 <b>Pair:</b> ${data.tradingPair}
📌 <b>Type:</b> ${data.tradeType.toUpperCase()}
💵 <b>Amount:</b> $${data.amount}
📥 <b>Entry:</b> $${data.entryPrice}
${data.exitPrice ? `📤 <b>Exit:</b> $${data.exitPrice}` : ''}
⏱️ <b>Duration:</b> ${data.duration}

${resultEmoji} <b>Result:</b> ${resultText}
💰 <b>P&L:</b> ${data.result === 'win' ? '+' : '-'}$${data.pnl}
📅 <b>Time:</b> ${formatDate(new Date())}
`;
  await sendTelegramMessage(message.trim());
}

export async function notifyError(data: {
  type: 'trade_failed' | 'deposit_validation_failed' | 'withdrawal_failed' | 'duplicate_txid' | 'wallet_changed' | 'security';
  userId?: number;
  userEmail?: string;
  details: string;
  errorMessage?: string;
}): Promise<void> {
  const typeLabels = {
    trade_failed: '📉 TRADE EXECUTION FAILED',
    deposit_validation_failed: '💰 DEPOSIT VALIDATION FAILED',
    withdrawal_failed: '🏦 WITHDRAWAL FAILED',
    duplicate_txid: '🔄 DUPLICATE TXID DETECTED',
    wallet_changed: '🔐 WALLET ADDRESS CHANGED',
    security: '🚨 SECURITY ALERT'
  };

  const message = `
⚠️ <b>${typeLabels[data.type]}</b>

${data.userId ? `👤 <b>User ID:</b> ${data.userId}` : ''}
${data.userEmail ? `📧 <b>Email:</b> ${escapeHtml(data.userEmail)}` : ''}

📋 <b>Details:</b> ${escapeHtml(data.details)}
${data.errorMessage ? `❌ <b>Error:</b> ${escapeHtml(data.errorMessage)}` : ''}
📅 <b>Time:</b> ${formatDate(new Date())}
`;
  await sendTelegramMessage(message.trim());
}

export async function testTelegramConnection(): Promise<boolean> {
  const message = `
🔔 <b>TELEGRAM ALERTS CONNECTED</b>

Your KuCoin VIP admin alerts are now active.
📅 <b>Time:</b> ${formatDate(new Date())}
`;
  return await sendTelegramMessage(message.trim());
}

export async function notifyVisitorAlert(data: {
  isRegistered: boolean;
  userId?: number;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  accountCreatedAt?: Date | null;
  ip: string;
  country: string | null;
  city: string | null;
  isp: string | null;
  deviceType: string;
  browser: string;
  os: string;
  pageVisited: string;
  isVpn: boolean;
  isProxy: boolean;
  securityFlags: string[];
}): Promise<void> {
  const headline = data.isRegistered ? '🚨 REGISTERED USER VISIT' : '👀 UNREGISTERED USER VISIT';
  
  let securityNotes = '';
  if (data.securityFlags.length > 0) {
    securityNotes = data.securityFlags.map(flag => {
      if (flag === 'VPN_PROXY_DETECTED') return '🚫 VPN / PROXY DETECTED';
      if (flag === 'HIGH_RISK_COUNTRY') return '🔥 HIGH-RISK COUNTRY VISIT';
      if (flag === 'MULTIPLE_IP_ACTIVITY') return '🚨 MULTIPLE IP ACTIVITY DETECTED';
      if (flag.startsWith('NEW_COUNTRY_LOGIN:')) return `⚠️ LOGIN FROM NEW COUNTRY: ${flag.split(':')[1]}`;
      return `⚠️ ${flag}`;
    }).join('\n');
  }

  let message = '';
  
  if (data.isRegistered) {
    message = `
${headline}

👤 <b>Name:</b> ${data.fullName ? escapeHtml(data.fullName) : 'Not set'}
📧 <b>Email:</b> ${data.email ? escapeHtml(data.email) : 'N/A'}
📱 <b>Phone:</b> ${data.phone || 'Not provided'}
🆔 <b>User ID:</b> ${data.userId}
📅 <b>Registered:</b> ${data.accountCreatedAt ? formatDate(data.accountCreatedAt) : 'Unknown'}

🌍 <b>Country:</b> ${data.country || 'Unknown'}
🏙 <b>City:</b> ${data.city || 'Unknown'}
🌐 <b>IP:</b> ${data.ip}
🔌 <b>ISP:</b> ${data.isp || 'Unknown'}
🖥 <b>Device:</b> ${data.deviceType} / ${data.browser}
💻 <b>OS:</b> ${data.os}
📄 <b>Page:</b> ${escapeHtml(data.pageVisited)}
🕒 <b>Time:</b> ${formatDate(new Date())}
${securityNotes ? `\n⚠️ <b>Security Alerts:</b>\n${securityNotes}` : ''}
`;
  } else {
    message = `
${headline}

🌍 <b>Country:</b> ${data.country || 'Unknown'}
🏙 <b>City:</b> ${data.city || 'Unknown'}
🌐 <b>IP:</b> ${data.ip}
🔌 <b>ISP:</b> ${data.isp || 'Unknown'}
🖥 <b>Device:</b> ${data.deviceType} / ${data.browser}
💻 <b>OS:</b> ${data.os}
📄 <b>Page:</b> ${escapeHtml(data.pageVisited)}
🕒 <b>Time:</b> ${formatDate(new Date())}
${securityNotes ? `\n⚠️ <b>Security Alerts:</b>\n${securityNotes}` : ''}
`;
  }

  await sendTelegramMessage(message.trim());
}

export async function notifyDailySummary(data: {
  totalVisits: number;
  registeredVisits: number;
  unregisteredVisits: number;
  uniqueIps: number;
  topCountries: { country: string; count: number }[];
  vpnProxyCount: number;
  suspiciousCount: number;
}): Promise<void> {
  const topCountriesList = data.topCountries
    .slice(0, 5)
    .map((c, i) => `   ${i + 1}. ${c.country}: ${c.count}`)
    .join('\n');

  const message = `
📊 <b>DAILY VISIT SUMMARY</b>

📈 <b>Total Visits:</b> ${data.totalVisits}
👤 <b>Registered:</b> ${data.registeredVisits}
👻 <b>Unregistered:</b> ${data.unregisteredVisits}
🔢 <b>Unique IPs:</b> ${data.uniqueIps}

🌍 <b>Top Countries:</b>
${topCountriesList || '   No data'}

🚫 <b>VPN/Proxy Visits:</b> ${data.vpnProxyCount}
⚠️ <b>Suspicious Activity:</b> ${data.suspiciousCount}

📅 <b>Report Date:</b> ${formatDate(new Date())}
`;
  await sendTelegramMessage(message.trim());
}
