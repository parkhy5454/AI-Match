
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@ai-match.com',
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

export function getWelcomeEmailTemplate(username: string, verifyUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
          .content { padding: 20px; border: 1px solid #e0e0e0; margin-top: 20px; border-radius: 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AI-Match에 오신 것을 환영합니다!</h1>
          </div>
          <div class="content">
            <p>안녕하세요, ${username}님!</p>
            <p>AI-Match 가입을 환영합니다. 아래 버튼을 클릭하여 이메일을 인증해주세요.</p>
            <a href="${verifyUrl}" class="button">이메일 인증하기</a>
            <p style="margin-top: 20px; color: #999; font-size: 12px;">
              이 링크는 24시간 동안 유효합니다.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getPasswordResetEmailTemplate(username: string, resetUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; padding: 20px; border-radius: 8px; }
          .content { padding: 20px; border: 1px solid #e0e0e0; margin-top: 20px; border-radius: 8px; }
          .button { display: inline-block; background: #f44336; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>비밀번호 재설정</h1>
          </div>
          <div class="content">
            <p>안녕하세요, ${username}님!</p>
            <p>비밀번호를 재설정하기 위해 아래 버튼을 클릭해주세요.</p>
            <a href="${resetUrl}" class="button">비밀번호 재설정</a>
            <p style="margin-top: 20px; color: #999; font-size: 12px;">
              이 링크는 1시간 동안 유효합니다. 요청하지 않으셨다면 이 이메일을 무시해주세요.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}
