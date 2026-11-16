import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY!);

const FROM_EMAIL = 'support@lockedkuzoin.vip';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    console.log(`Attempting to send email to ${params.to} with subject: ${params.subject}`);
    const response = await mailService.send({
      to: params.to,
      from: FROM_EMAIL,
      subject: params.subject,
      html: params.html,
    });
    console.log(`Email sent successfully to ${params.to}: ${params.subject}`, { messageId: response[0]?.headers?.['x-message-id'] });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('SendGrid response body:', (error as any).response?.body);
    }
    return false;
  }
}

// Welcome Email Template
export async function sendWelcomeEmail(userEmail: string, username: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: white;">KUCOIN</h1>
        </div>

      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Hello ${username}!</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Welcome to KUCOIN! Your account has been successfully created and you're now ready to start your trading journey.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1a1a2e; margin-top: 0;">Getting Started:</h3>
          <ul style="color: #666; padding-left: 20px;">
            <li>Make your first deposit to start trading</li>
            <li>Explore 40+ cryptocurrency trading pairs</li>
            <li>Refer friends and earn commissions</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Start Trading Now
          </a>
        </div>
      </div>
      
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; border-radius: 10px; margin-top: 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: white; font-size: 14px; margin: 0;">
          If you have any questions, contact our support team.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject: 'Welcome to KUCOIN - Your Trading Account is Ready!',
    html
  });
}

// Deposit Notification Email
export async function sendDepositNotificationEmail(userEmail: string, username: string, amount: string, crypto: string, txHash: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: white;">KUCOIN</h1>
        </div>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Hello ${username}!</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          We have received your deposit and it's currently being processed by our team.
        </p>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #856404; margin-top: 0;">Deposit Details:</h3>
          <p style="margin: 5px 0; color: #856404;"><strong>Amount:</strong> ${amount} ${crypto}</p>
          <p style="margin: 5px 0; color: #856404;"><strong>Transaction Hash:</strong> ${txHash}</p>
          <p style="margin: 5px 0; color: #856404;"><strong>Status:</strong> Pending Admin Approval</p>
        </div>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Your deposit will be credited to your account once approved by our admin team. This usually takes 5-30 minutes.
        </p>
      </div>
      
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; border-radius: 10px; margin-top: 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: white; font-size: 14px; margin: 0;">
          If you have any questions, contact our support team.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject: 'Deposit Received - Pending Approval | KUCOIN',
    html
  });
}

// Deposit Rejected Email
export async function sendDepositRejectedEmail(userEmail: string, username: string, amount: string, crypto: string, reason: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: white;">KUCOIN</h1>
        </div>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Hello ${username},</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Unfortunately, your deposit request has been declined by our team.
        </p>
        
        <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #721c24; margin-top: 0;">Declined Deposit:</h3>
          <p style="margin: 5px 0; color: #721c24;"><strong>Amount:</strong> ${amount} ${crypto}</p>
          <p style="margin: 5px 0; color: #721c24;"><strong>Reason:</strong> ${reason}</p>
          <p style="margin: 5px 0; color: #721c24;"><strong>Status:</strong> ❌ Declined</p>
        </div>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Please check your transaction details and ensure you've sent the deposit to the correct wallet address. If you have questions about this decision, please contact our support team.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Contact Support
          </a>
        </div>
      </div>
      
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; border-radius: 10px; margin-top: 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: white; font-size: 14px; margin: 0;">
          If you have any questions, contact our support team.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject: 'Deposit Request Declined | KUCOIN',
    html
  });
}

// Deposit Approved Email
export async function sendDepositApprovedEmail(userEmail: string, username: string, amount: string, crypto: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: white;">KUCOIN</h1>
        </div>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Great news, ${username}!</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Your deposit has been approved and credited to your account. You can now start trading!
        </p>
        
        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #155724; margin-top: 0;">Approved Deposit:</h3>
          <p style="margin: 5px 0; color: #155724;"><strong>Amount:</strong> ${amount} ${crypto}</p>
          <p style="margin: 5px 0; color: #155724;"><strong>Status:</strong> ✅ Approved & Credited</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Start Trading Now
          </a>
        </div>
      </div>
      
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; border-radius: 10px; margin-top: 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: white; font-size: 14px; margin: 0;">
          If you have any questions, contact our support team.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject: 'Deposit Approved - Ready to Trade! | KUCOIN',
    html
  });
}

// Withdrawal Request Email
export async function sendWithdrawalRequestEmail(userEmail: string, username: string, amount: string, crypto: string, address: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: white;">KUCOIN</h1>
        </div>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Hello ${username}!</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          We have received your withdrawal request and it's currently being reviewed by our team.
        </p>
        
        <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #721c24; margin-top: 0;">Withdrawal Details:</h3>
          <p style="margin: 5px 0; color: #721c24;"><strong>Amount:</strong> ${amount} ${crypto}</p>
          <p style="margin: 5px 0; color: #721c24;"><strong>Address:</strong> ${address}</p>
          <p style="margin: 5px 0; color: #721c24;"><strong>Status:</strong> Pending Admin Review</p>
        </div>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Withdrawal requests are typically processed within 24 hours. You will receive an email once your request is approved or if we need additional information.
        </p>
      </div>
      
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; border-radius: 10px; margin-top: 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: white; font-size: 14px; margin: 0;">
          If you have any questions, contact our support team.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject: 'Withdrawal Request Received | KUCOIN',
    html
  });
}

// Withdrawal Approved Email
export async function sendWithdrawalApprovedEmail(userEmail: string, username: string, amount: string, crypto: string, txHash: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: white;">KUCOIN</h1>
        </div>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Good news, ${username}!</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Your withdrawal has been approved and processed. The funds have been sent to your wallet.
        </p>
        
        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #155724; margin-top: 0;">Transaction Details:</h3>
          <p style="margin: 5px 0; color: #155724;"><strong>Amount:</strong> ${amount} ${crypto}</p>
          <p style="margin: 5px 0; color: #155724;"><strong>Transaction Hash:</strong> ${txHash}</p>
          <p style="margin: 5px 0; color: #155724;"><strong>Status:</strong> ✅ Completed</p>
        </div>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          You can verify this transaction on the blockchain using the transaction hash above.
        </p>
      </div>
      
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; border-radius: 10px; margin-top: 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: white; font-size: 14px; margin: 0;">
          If you have any questions, contact our support team.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject: 'Withdrawal Approved & Processed | KUCOIN',
    html
  });
}

// Withdrawal Rejected Email
export async function sendWithdrawalRejectedEmail(userEmail: string, username: string, amount: string, crypto: string, reason: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: white;">KUCOIN</h1>
        </div>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Hello ${username},</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Unfortunately, your withdrawal request has been declined by our team.
        </p>
        
        <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #721c24; margin-top: 0;">Declined Withdrawal:</h3>
          <p style="margin: 5px 0; color: #721c24;"><strong>Amount:</strong> ${amount} ${crypto}</p>
          <p style="margin: 5px 0; color: #721c24;"><strong>Reason:</strong> ${reason}</p>
          <p style="margin: 5px 0; color: #721c24;"><strong>Status:</strong> ❌ Declined</p>
        </div>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          The requested amount has been returned to your account balance. If you have questions about this decision, please contact our support team.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Contact Support
          </a>
        </div>
      </div>
      
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; border-radius: 10px; margin-top: 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: white; font-size: 14px; margin: 0;">
          If you have any questions, contact our support team.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject: 'Withdrawal Request Declined | KUCOIN',
    html
  });
}

// Trade Placed Email
export async function sendTradeNotificationEmail(userEmail: string, username: string, pair: string, tradeType: string, amount: string, leverage: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: white;">KUCOIN</h1>
        </div>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Hello ${username}!</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Your trade has been successfully placed and is now active in the market.
        </p>
        
        <div style="background: #cce5ff; border: 1px solid #99d3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0056b3; margin-top: 0;">Trade Details:</h3>
          <p style="margin: 5px 0; color: #0056b3;"><strong>Pair:</strong> ${pair}</p>
          <p style="margin: 5px 0; color: #0056b3;"><strong>Type:</strong> ${tradeType.toUpperCase()}</p>
          <p style="margin: 5px 0; color: #0056b3;"><strong>Amount:</strong> $${amount}</p>
          <p style="margin: 5px 0; color: #0056b3;"><strong>Leverage:</strong> ${leverage}x</p>
          <p style="margin: 5px 0; color: #0056b3;"><strong>Status:</strong> 🔄 Active</p>
        </div>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Your trade will automatically close in 60 seconds. You'll receive another email with the results once completed.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Live Trading
          </a>
        </div>
      </div>
      
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; border-radius: 10px; margin-top: 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: white; font-size: 14px; margin: 0;">
          If you have any questions, contact our support team.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject: `Trade Placed: ${pair} ${tradeType.toUpperCase()} | KUCOIN`,
    html
  });
}

// Trade Result Email
// Password Reset Email
export async function sendPasswordResetEmail(userEmail: string, username: string, resetToken: string): Promise<boolean> {
  const resetUrl = `${process.env.REPLIT_DEV_DOMAIN || 'https://your-domain.com'}/reset-password?token=${resetToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: white;">KUCOIN</h1>
        </div>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Hello ${username}! We received a request to reset your password. Click the button below to reset your password.
        </p>
        
        <div style="background: #e9ecef; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0; color: #495057;"><strong>Security Notice:</strong></p>
          <p style="margin: 5px 0; color: #495057;">This link will expire in 1 hour for security reasons.</p>
          <p style="margin: 5px 0; color: #495057;">If you didn't request this reset, please ignore this email.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
          Or copy and paste this link in your browser:<br>
          <span style="color: #28a745; word-break: break-all;">${resetUrl}</span>
        </p>
      </div>
      
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; border-radius: 10px; margin-top: 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: white; font-size: 14px; margin: 0;">
          If you have any questions, contact our support team.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject: 'Reset Your Password | KUCOIN',
    html
  });
}

// Migration Announcement Email
export async function sendMigrationAnnouncementEmail(userEmail: string, username: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: white;">KUCOIN VIP</h1>
        </div>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Migration Successful – Welcome to the New KuCoin VIP Interface</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Dear Valued User,
        </p>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          We're pleased to inform you that your account has been successfully migrated to the new KuCoin VIP platform interface.
        </p>
        
        <div style="background: #e8f5e8; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #155724; margin-top: 0;">✅ Platform Improvements:</h3>
          <ul style="color: #155724; padding-left: 20px; text-align: left;">
            <li>All previous system bugs and issues resolved</li>
            <li>Fixed deposits, withdrawals, and trading delays</li>
            <li>Enhanced platform stability and security</li>
            <li>Optimized for faster user experience</li>
            <li>Seamless access to all features</li>
          </ul>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #856404; margin-top: 0;">🔗 Access Your Account:</h3>
          <p style="color: #856404; margin: 5px 0; font-size: 18px; font-weight: bold;">
            gatewaykulockvipzdash.com
          </p>
          <p style="color: #856404; margin: 5px 0; font-size: 14px;">
            Use your original email address for login
          </p>
        </div>
        
        <div style="background: #cce5ff; border: 1px solid #99d3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0056b3; margin-top: 0;">📋 Next Steps:</h3>
          <p style="color: #0056b3; margin: 5px 0;">
            If you haven't completed your registration, please do so using your original email address and contact Customer Support for balance migration and full activation.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://gatewaykulockvipzdash.com" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
            Access New Platform
          </a>
        </div>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6; text-align: center;">
          Thank you for your trust and welcome to a better KuCoin VIP experience.
        </p>
      </div>
      
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; border-radius: 10px; margin-top: 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: white; font-size: 14px; margin: 0;">
          — KuCoin VIP Team<br>
          If you have any questions, contact our support team.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject: 'Migration Successful – Welcome to the New KuCoin VIP Interface',
    html
  });
}

export async function sendTradeResultEmail(userEmail: string, username: string, pair: string, tradeType: string, amount: string, result: 'win' | 'loss', pnl: string): Promise<boolean> {
  const isWin = result === 'win';
  const resultColor = isWin ? '#28a745' : '#dc3545';
  const bgColor = isWin ? '#d4edda' : '#f8d7da';
  const borderColor = isWin ? '#c3e6cb' : '#f5c6cb';
  const resultText = isWin ? 'PROFIT' : 'LOSS';
  const emoji = isWin ? '🎉' : '📉';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: white;">KUCOIN</h1>
        </div>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">${isWin ? 'Congratulations' : 'Trade Update'}, ${username}!</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Your trade has completed. ${isWin ? 'Great job on this profitable trade!' : 'Better luck next time - trading involves risk.'}
        </p>
        
        <div style="background: ${bgColor}; border: 1px solid ${borderColor}; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: ${resultColor}; margin-top: 0;">Final Results:</h3>
          <p style="margin: 5px 0; color: ${resultColor};"><strong>Pair:</strong> ${pair}</p>
          <p style="margin: 5px 0; color: ${resultColor};"><strong>Type:</strong> ${tradeType.toUpperCase()}</p>
          <p style="margin: 5px 0; color: ${resultColor};"><strong>Amount:</strong> $${amount}</p>
          <p style="margin: 5px 0; color: ${resultColor};"><strong>Result:</strong> ${resultText}</p>
          <p style="margin: 5px 0; color: ${resultColor}; font-size: 18px; font-weight: bold;"><strong>P&L:</strong> ${pnl}</p>
        </div>
        
        ${isWin ? `
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Your profit has been added to your account balance. Keep up the excellent trading!
        </p>
        ` : `
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Don't let this discourage you. Even professional traders have losing trades. Learn from this experience and keep improving your strategy.
        </p>
        `}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            ${isWin ? 'Trade Again' : 'Continue Trading'}
          </a>
        </div>
      </div>
      
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; border-radius: 10px; margin-top: 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: white; font-size: 14px; margin: 0;">
          If you have any questions, contact our support team.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject: `Trade ${resultText}: ${pair} ${pnl} | KUCOIN`,
    html
  });
}

export async function sendCreditAlertEmail(userEmail: string, username: string, amount: string, cryptocurrency: string): Promise<boolean> {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  const formattedTime = currentDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a1a; color: #ffffff; padding: 20px; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #00d4aa; margin: 0; font-size: 24px;">💰 Credit Alert</h1>
        <p style="color: #cccccc; font-size: 16px; margin: 10px 0 0 0;">KUCOIN VIP</p>
      </div>
      
      <div style="background-color: #2a2a2a; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
        <p style="margin: 0 0 15px 0; font-size: 16px;">Dear ${username},</p>
        
        <p style="margin: 0 0 20px 0; line-height: 1.5;">We're pleased to inform you that your KuCoin VIP account has been successfully credited.</p>
        
        <div style="background-color: #0f3728; border-left: 4px solid #00d4aa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0 0 12px 0; font-weight: bold; color: #00d4aa; font-size: 18px;">Credit Details:</p>
          <p style="margin: 0 0 8px 0;">💰 Amount: ${amount} ${cryptocurrency}</p>
          <p style="margin: 0 0 8px 0;">📥 Status: Successful</p>
          <p style="margin: 0 0 8px 0;">📅 Date: ${formattedDate}</p>
          <p style="margin: 0;">⏰ Time: ${formattedTime}</p>
        </div>
        
        <p style="margin: 20px 0; line-height: 1.5;">You can view your updated balance and transaction details by logging into your dashboard.</p>
        
        <p style="margin: 15px 0 0 0;">Thank you for choosing KuCoin VIP.</p>
        
        <p style="margin: 15px 0 0 0;">Best regards,<br>KuCoin VIP Team</p>
      </div>
      
      <div style="text-align: center; color: #888888; font-size: 12px;">
        <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject: 'Credit Alert: 1,500 USDT Received in Your KuCoin VIP Account',
    html
  });
}