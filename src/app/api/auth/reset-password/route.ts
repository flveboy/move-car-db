import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production'

interface ResetTokenPayload {
  userId: string
  type: 'password_reset'
  iat: number
  exp: number
}

// 专门验证重置令牌的函数
function verifyResetToken(token: string): ResetTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as ResetTokenPayload
  } catch (error) {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword, validateOnly } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: '重置令牌不能为空' },
        { status: 400 }
      )
    }

    // 如果只是验证token有效性，不执行密码重置
    if (validateOnly) {
      const payload = verifyResetToken(token)
      if (!payload) {
        return NextResponse.json(
          { error: '重置链接无效或已过期' },
          { status: 400 }
        )
      }

      if (payload.type !== 'password_reset') {
        return NextResponse.json(
          { error: '无效的重置令牌' },
          { status: 400 }
        )
      }

      // 检查令牌是否已被使用
      const usedToken = await db.usedResetToken.findUnique({
        where: { token }
      })

      if (usedToken) {
        return NextResponse.json(
          { error: '重置链接已被使用，请重新申请' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: '重置链接有效'
      })
    }

    if (!newPassword) {
      return NextResponse.json(
        { error: '新密码不能为空' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: '密码长度不能少于6位' },
        { status: 400 }
      )
    }

    // 验证重置令牌
    const payload = verifyResetToken(token)
    if (!payload) {
      console.log('JWT验证失败 - 令牌无效或已过期')
      return NextResponse.json(
        { error: '重置链接无效或已过期' },
        { status: 400 }
      )
    }

    if (payload.type !== 'password_reset') {
      console.log('JWT验证失败 - 令牌类型不匹配:', payload.type)
      return NextResponse.json(
        { error: '无效的重置令牌' },
        { status: 400 }
      )
    }

    console.log('JWT验证成功 - 用户ID:', payload.userId)

    // 检查令牌是否已被使用
    const usedToken = await db.usedResetToken.findUnique({
      where: { token }
    })

    if (usedToken) {
      return NextResponse.json(
        { error: '重置链接已被使用，请重新申请' },
        { status: 400 }
      )
    }

    // 查找用户
    const user = await db.owner.findUnique({
      where: { id: payload.userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 检查新密码是否与旧密码相同
    const isSamePassword = await bcrypt.compare(newPassword, user.password)
    if (isSamePassword) {
      return NextResponse.json(
        { error: '新密码不能与旧密码相同' },
        { status: 400 }
      )
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // 更新密码
    await db.owner.update({
      where: { id: payload.userId },
      data: { password: hashedPassword }
    })

    // 记录已使用的令牌
    await db.usedResetToken.create({
      data: {
        token: token,
        userId: payload.userId
      }
    })

    return NextResponse.json({
      success: true,
      message: '密码重置成功，请使用新密码登录'
    })

  } catch (error) {
    console.error('重置密码处理错误:', error)
    return NextResponse.json(
      { error: '处理请求时发生错误' },
      { status: 500 }
    )
  }
}