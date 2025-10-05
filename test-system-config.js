// 简单测试系统配置功能
async function testSystemConfig() {
  try {
    console.log('正在测试系统配置功能...')
    
    // 测试获取公开配置
    console.log('\n1. 测试获取公开配置:')
    const response = await fetch('http://localhost:3000/api/system-config/public?key=ALLOW_REGISTRATION')
    
    if (response.ok) {
      const config = await response.json()
      console.log('✅ 获取配置成功:', config)
    } else {
      console.log('❌ 获取配置失败:', response.status, response.statusText)
    }
    
    // 测试注册接口（应该根据配置返回不同结果）
    console.log('\n2. 测试注册接口验证:')
    const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testuser',
        phone: '13800138000',
        name: '测试用户',
        password: '123456',
        confirmPassword: '123456'
      })
    })
    
    const registerResult = await registerResponse.json()
    console.log('注册接口响应:', registerResponse.status, registerResult)
    
  } catch (error) {
    console.error('测试失败:', error)
  }
}

testSystemConfig()