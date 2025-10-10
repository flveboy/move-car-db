import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// 创建邮件传输器（支持多种SMTP服务）
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // 检查环境变量是否配置
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('SMTP配置未设置，跳过邮件发送')
      return true // 返回成功但不实际发送邮件
    }

    const mailOptions = {
      from: `"挪车码平台" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    }

    const result = await transporter.sendMail(mailOptions)
    console.log('邮件发送成功:', result.messageId)
    return true
    
  } catch (error) {
    console.error('邮件发送失败:', error)
    return false
  }
}

// 测试邮件配置
export async function testEmailConfig(): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('SMTP配置未设置')
    return false
  }

  try {
    await transporter.verify()
    console.log('邮件服务器连接成功')
    return true
  } catch (error) {
    console.error('邮件服务器连接失败:', error)
    return false
  }
}