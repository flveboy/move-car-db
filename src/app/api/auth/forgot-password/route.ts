import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { sendEmail } from '@/lib/email'

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production'

// 生成重置密码令牌（有效期1小时）
function generateResetToken(userId: string): string {
  const payload = {
    userId: userId,
    type: 'password_reset',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1小时
  }
  
  return jwt.sign(payload, JWT_SECRET)
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: '邮箱地址不能为空' },
        { status: 400 }
      )
    }

    // 查找用户
    const user = await db.owner.findFirst({
      where: { email },
      select: { id: true, username: true, name: true, email: true }
    })

    if (!user) {
      // 出于安全考虑，即使邮箱不存在也返回成功
      return NextResponse.json({
        success: true,
        message: '如果邮箱存在，重置密码链接将发送到您的邮箱'
      })
    }

    // 生成重置令牌
    const resetToken = generateResetToken(user.id)

    // 构建重置链接
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`

    // 检查邮件配置
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      return NextResponse.json({
        success: false,
        message: '邮件服务未配置，请联系管理员',
        resetToken: resetToken // 返回令牌用于调试或手动处理
      }, { status: 503 })
    }

    // 发送重置密码邮件
    const emailSent = await sendEmail({
      to: user.email!,
      subject: '重置密码 - 挪车码平台',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">重置密码</h2>
          <p>尊敬的 ${user.name}，</p>
          <p>我们收到了您重置密码的请求。请点击下面的链接来设置新密码：</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              重置密码
            </a>
          </p>
          <p>或者复制以下链接到浏览器：</p>
          <p style="word-break: break-all; color: #666;">${resetLink}</p>
          <p><strong>注意：</strong>此链接将在1小时后失效。</p>
          <p>如果您没有请求重置密码，请忽略此邮件。</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
        </div>
      `
    })

    if (!emailSent) {
      return NextResponse.json(
        { error: '邮件发送失败，请稍后重试' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '重置密码链接已发送到您的邮箱，请查收'
    })

  } catch (error) {
    console.error('忘记密码处理错误:', error)
    return NextResponse.json(
      { error: '处理请求时发生错误' },
      { status: 500 }
    )
  }
}