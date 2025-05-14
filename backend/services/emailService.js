import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

// Configure AWS SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Email templates
const templates = {
  forgotPassword: (token, username) => ({
    subject: 'Reset Your Password - FitTrack',
    body: `
      <h2>Hello ${username},</h2>
      <p>We received a request to reset your password. Click the link below to set a new password:</p>
      <p><a href="${process.env.FRONTEND_URL}/reset-password?token=${token}" style="padding: 10px 20px; background-color: #5E58D5; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email or contact support if you have concerns.</p>
      <p>Best regards,<br>FitTrack Team</p>
    `
  }),

  passwordChanged: (username) => ({
    subject: 'Password Successfully Changed - FitTrack',
    body: `
      <h2>Hello ${username},</h2>
      <p>Your password has been successfully changed.</p>
      <p>If you did not make this change, please contact our support team immediately.</p>
      <p>Best regards,<br>FitTrack Team</p>
    `
  })
};

// Send email function
async function sendEmail(to, template, data) {
  try {
    const emailContent = templates[template](data.token, data.username);

    const params = {
      Source: process.env.SES_SENDER_EMAIL,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: emailContent.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: emailContent.body,
            Charset: 'UTF-8',
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    
    console.log('Email sent successfully:', response.MessageId);
    return { success: true, messageId: response.MessageId };

  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

// Helper functions for specific email types
export async function sendPasswordResetEmail(email, token, username) {
  return sendEmail(email, 'forgotPassword', { token, username });
}

export async function sendPasswordChangedEmail(email, username) {
  return sendEmail(email, 'passwordChanged', { username });
}

export default {
  sendPasswordResetEmail,
  sendPasswordChangedEmail
};