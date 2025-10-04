import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; driverId: string }> }) {
  try {
    // 验证token
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader || undefined)
    
    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      )
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const { driverId } = resolvedParams
    
    // 获取代开驾驶员详情
    const driver = await db.driver.findUnique({
      where: { id: driverId }
    })
    
    if (!driver) {
      return NextResponse.json(
        { error: '代开驾驶员不存在' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(driver)
    
  } catch (error) {
    console.error('获取代开驾驶员详情错误:', error)
    return NextResponse.json(
      { error: '获取代开驾驶员详情失败' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; driverId: string }> }) {
  try {
    // 验证token
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader || undefined)
    
    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      )
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const { driverId } = resolvedParams
    const body = await request.json()
    
    // 更新代开驾驶员信息
    const driver = await db.driver.update({
      where: { id: driverId },
      data: {
        name: body.name,
        phone: body.phone,
        dingtalkWebhook: body.dingtalkWebhook || '',
        dingtalkSign: body.dingtalkSign || false,
        dingtalkSecret: body.dingtalkSecret || '',
        dingtalkKeyword: body.dingtalkKeyword || '',
        wechatWebhook: body.wechatWebhook || ''
      }
    })
    
    return NextResponse.json({
      success: true,
      data: driver
    })
    
  } catch (error) {
    console.error('更新代开驾驶员错误:', error)
    return NextResponse.json(
      { error: '更新代开驾驶员失败' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; driverId: string }> }) {
  try {
    // 验证token
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader || undefined)
    
    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      )
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const { driverId } = resolvedParams
    const body = await request.json()
    
    // 更新代开驾驶员信息
    const driver = await db.driver.update({
      where: { id: driverId },
      data: {
        name: body.name,
        phone: body.phone,
        dingtalkWebhook: body.dingtalkWebhook,
        dingtalkSign: body.dingtalkSign,
        dingtalkKeyword: body.dingtalkKeyword,
        dingtalkSecret: body.dingtalkSecret,
        wechatWebhook: body.wechatWebhook
      }
    })
    
    return NextResponse.json(driver)
    
  } catch (error) {
    console.error('更新代开驾驶员错误:', error)
    return NextResponse.json(
      { error: '更新代开驾驶员失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; driverId: string }> }) {
  try {
    // 验证token
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader || undefined)
    
    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      )
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const { driverId } = resolvedParams
    
    // 删除代开驾驶员
    await db.driver.delete({
      where: { id: driverId }
    })
    
    return NextResponse.json({ message: '代开驾驶员已删除' })
    
  } catch (error) {
    console.error('删除代开驾驶员错误:', error)
    return NextResponse.json(
      { error: '删除代开驾驶员失败' },
      { status: 500 }
    )
  }
}