const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = null;
let testUserId = null;
let testVehicleId = null;
let testCodeId = null;
let testOwnerId = null;
let testDriverId = null;

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// 测试辅助函数
async function testAPI(name, method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    log(`✅ ${name}: ${response.status} - ${response.statusText}`, 'green');
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    if (error.response) {
      log(`❌ ${name}: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`, 'red');
      return { success: false, error: error.response.data, status: error.response.status };
    } else {
      log(`❌ ${name}: ${error.message}`, 'red');
      return { success: false, error: error.message };
    }
  }
}

// 获取认证头
function getAuthHeaders() {
  return authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
}

async function runTests() {
  log('🚀 开始API测试...', 'blue');
  
  // 1. 健康检查
  log('\n📊 1. 健康检查', 'yellow');
  await testAPI('健康检查', 'GET', '/api/health');
  
  // 2. 公开系统配置
  log('\n🔧 2. 公开系统配置', 'yellow');
  await testAPI('获取公开系统配置', 'GET', '/api/system-config/public');
  
  // 3. 认证相关测试
  log('\n🔐 3. 认证系统测试', 'yellow');
  
  // 注册测试用户
  const registerResult = await testAPI('用户注册', 'POST', '/api/auth/register', {
    username: 'testuser_' + Date.now(),
    email: 'test_' + Date.now() + '@example.com',
    password: 'Test123456!',
    name: '测试用户'
  });
  
  // 登录
  if (registerResult.success) {
    const loginResult = await testAPI('用户登录', 'POST', '/api/auth/login', {
      username: registerResult.data.user?.username || 'testuser',
      password: 'Test123456!'
    });
    
    if (loginResult.success && loginResult.data.token) {
      authToken = loginResult.data.token;
      log('🔑 认证令牌已获取', 'green');
    }
  }
  
  // 获取当前用户信息
  await testAPI('获取当前用户', 'GET', '/api/auth/me', null, getAuthHeaders());
  
  // 修改密码测试
  await testAPI('修改密码', 'POST', '/api/auth/change-password', {
    currentPassword: 'Test123456!',
    newPassword: 'NewTest123456!'
  }, getAuthHeaders());
  
  // 4. 车主管理
  log('\n👥 4. 车主管理测试', 'yellow');
  
  // 创建车主
  const ownerResult = await testAPI('创建车主', 'POST', '/api/owners', {
    name: '测试车主',
    phone: '13800138001',
    email: 'owner@example.com',
    address: '测试地址'
  }, getAuthHeaders());
  
  if (ownerResult.success && ownerResult.data.id) {
    testOwnerId = ownerResult.data.id;
  }
  
  // 获取车主列表
  await testAPI('获取车主列表', 'GET', '/api/owners', null, getAuthHeaders());
  
  if (testOwnerId) {
    // 获取单个车主
    await testAPI('获取单个车主', 'GET', `/api/owners/${testOwnerId}`, null, getAuthHeaders());
    
    // 更新车主
    await testAPI('更新车主', 'PUT', `/api/owners/${testOwnerId}`, {
      name: '更新的车主名称',
      phone: '13800138002'
    }, getAuthHeaders());
  }
  
  // 5. 车辆管理
  log('\n🚗 5. 车辆管理测试', 'yellow');
  
  // 创建车辆
  const vehicleResult = await testAPI('创建车辆', 'POST', '/api/vehicles', {
    plateNumber: '京A12345',
    model: '测试车型',
    color: '白色',
    ownerId: testOwnerId
  }, getAuthHeaders());
  
  if (vehicleResult.success && vehicleResult.data.id) {
    testVehicleId = vehicleResult.data.id;
  }
  
  // 获取车辆列表
  await testAPI('获取车辆列表', 'GET', '/api/vehicles', null, getAuthHeaders());
  
  if (testVehicleId) {
    // 获取单个车辆
    await testAPI('获取单个车辆', 'GET', `/api/vehicles/${testVehicleId}`, null, getAuthHeaders());
    
    // 更新车辆
    await testAPI('更新车辆', 'PUT', `/api/vehicles/${testVehicleId}`, {
      model: '更新的车型',
      color: '黑色'
    }, getAuthHeaders());
    
    // 车辆司机管理
    log('\n👨‍💼 5a. 车辆司机管理', 'yellow');
    
    // 添加司机
    const driverResult = await testAPI('添加司机', 'POST', `/api/vehicles/${testVehicleId}/drivers`, {
      name: '测试司机',
      phone: '13900139001',
      licenseNumber: 'D1234567890'
    }, getAuthHeaders());
    
    if (driverResult.success && driverResult.data.id) {
      testDriverId = driverResult.data.id;
    }
    
    // 获取车辆司机列表
    await testAPI('获取车辆司机', 'GET', `/api/vehicles/${testVehicleId}/drivers`, null, getAuthHeaders());
    
    if (testDriverId) {
      // 获取单个司机
      await testAPI('获取单个司机', 'GET', `/api/vehicles/${testVehicleId}/drivers/${testDriverId}`, null, getAuthHeaders());
      
      // 更新司机
      await testAPI('更新司机', 'PUT', `/api/vehicles/${testVehicleId}/drivers/${testDriverId}`, {
        name: '更新的司机',
        phone: '13900139002'
      }, getAuthHeaders());
      
      // 切换司机状态
      await testAPI('切换司机状态', 'PATCH', `/api/vehicles/${testVehicleId}/drivers/${testDriverId}/toggle`, null, getAuthHeaders());
    }
  }
  
  // 6. 二维码管理
  log('\n📱 6. 二维码管理测试', 'yellow');
  
  // 创建二维码
  const codeResult = await testAPI('创建二维码', 'POST', '/api/codes', {
    vehicleId: testVehicleId,
    type: 'TEMPORARY',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }, getAuthHeaders());
  
  if (codeResult.success && codeResult.data.id) {
    testCodeId = codeResult.data.id;
  }
  
  // 获取二维码列表
  await testAPI('获取二维码列表', 'GET', '/api/codes', null, getAuthHeaders());
  
  if (testCodeId) {
    // 获取单个二维码
    await testAPI('获取单个二维码', 'GET', `/api/codes/${testCodeId}`, null, getAuthHeaders());
    
    // 更新二维码
    await testAPI('更新二维码', 'PUT', `/api/codes/${testCodeId}`, {
      type: 'PERMANENT'
    }, getAuthHeaders());
    
    // 切换二维码状态
    await testAPI('切换二维码状态', 'POST', `/api/codes/${testCodeId}/toggle`, null, getAuthHeaders());
    
    // 二维码查找（公开接口）
    if (codeResult.data.code) {
      await testAPI('二维码查找', 'GET', `/api/codes/lookup/${codeResult.data.code}`);
    }
  }
  
  // 7. 扫码记录
  log('\n📝 7. 扫码记录测试', 'yellow');
  
  // 创建扫码记录
  await testAPI('创建扫码记录', 'POST', '/api/records', {
    codeId: testCodeId,
    scannerName: '测试扫码者',
    scannerPhone: '13700137001',
    reason: '测试扫码',
    location: '测试位置'
  });
  
  // 获取扫码记录列表
  await testAPI('获取扫码记录', 'GET', '/api/records', null, getAuthHeaders());
  
  if (testCodeId) {
    // 按二维码获取记录
    await testAPI('按二维码获取记录', 'GET', `/api/records/code/${testCodeId}`, null, getAuthHeaders());
  }
  
  if (testOwnerId) {
    // 按车主获取记录
    await testAPI('按车主获取记录', 'GET', `/api/records/owner/${testOwnerId}`, null, getAuthHeaders());
    
    // 车主记录统计
    await testAPI('车主记录统计', 'GET', '/api/records/owner/records', null, getAuthHeaders());
  }
  
  // 8. 用户统计
  log('\n📊 8. 用户统计测试', 'yellow');
  await testAPI('获取用户统计', 'GET', '/api/user/stats', null, getAuthHeaders());
  
  // 9. 通知配置
  log('\n🔔 9. 通知配置测试', 'yellow');
  
  // 获取通知配置
  await testAPI('获取通知配置', 'GET', '/api/user/notification-config', null, getAuthHeaders());
  
  // 更新通知配置
  await testAPI('更新通知配置', 'POST', '/api/user/notification-config', {
    dingtalkEnabled: true,
    wechatEnabled: false,
    emailEnabled: true
  }, getAuthHeaders());
  
  // 10. 通知测试
  log('\n📢 10. 通知系统测试', 'yellow');
  
  await testAPI('测试钉钉通知', 'POST', '/api/notifications/test-dingtalk', {
    message: '这是一条测试消息'
  }, getAuthHeaders());
  
  await testAPI('测试微信通知', 'POST', '/api/notifications/test-wechat', {
    message: '这是一条测试消息'
  }, getAuthHeaders());
  
  await testAPI('发送钉钉通知', 'POST', '/api/notifications/send-dingtalk', {
    message: '扫码通知测试',
    recordId: 1
  }, getAuthHeaders());
  
  await testAPI('发送微信通知', 'POST', '/api/notifications/send-wechat', {
    message: '扫码通知测试',
    recordId: 1
  }, getAuthHeaders());
  
  // 通知限流测试
  await testAPI('通知限流检查', 'GET', '/api/notifications/rate-limit', null, getAuthHeaders());
  await testAPI('通知限流设置', 'POST', '/api/notifications/rate-limit', {
    action: 'increment'
  }, getAuthHeaders());
  
  // 11. 管理员功能测试（需要管理员权限）
  log('\n👑 11. 管理员功能测试', 'yellow');
  
  // 获取系统配置
  await testAPI('获取系统配置', 'GET', '/api/admin/system-config', null, getAuthHeaders());
  
  // 更新系统配置
  await testAPI('更新系统配置', 'PUT', '/api/admin/system-config', {
    siteName: '测试站点',
    maxCodesPerUser: 10
  }, getAuthHeaders());
  
  // 获取所有用户
  await testAPI('获取所有用户', 'GET', '/api/admin/users', null, getAuthHeaders());
  
  // 创建用户
  const adminUserResult = await testAPI('管理员创建用户', 'POST', '/api/admin/users', {
    username: 'admintest_' + Date.now(),
    email: 'admintest_' + Date.now() + '@example.com',
    password: 'AdminTest123!',
    name: '管理员测试用户',
    role: 'USER'
  }, getAuthHeaders());
  
  if (adminUserResult.success && adminUserResult.data.id) {
    const adminTestUserId = adminUserResult.data.id;
    
    // 获取用户详情
    await testAPI('获取用户详情', 'GET', `/api/admin/users/${adminTestUserId}`, null, getAuthHeaders());
    
    // 更新用户
    await testAPI('更新用户', 'PUT', `/api/admin/users/${adminTestUserId}`, {
      name: '更新的用户名',
      role: 'ADMIN'
    }, getAuthHeaders());
    
    // 重置用户密码
    await testAPI('重置用户密码', 'POST', `/api/admin/users/${adminTestUserId}/reset-password`, {
      newPassword: 'ResetPassword123!'
    }, getAuthHeaders());
    
    // 删除用户
    await testAPI('删除用户', 'DELETE', `/api/admin/users/${adminTestUserId}`, null, getAuthHeaders());
  }
  
  // 性能统计
  await testAPI('获取性能统计', 'GET', '/api/admin/performance', null, getAuthHeaders());
  await testAPI('清除性能统计', 'DELETE', '/api/admin/performance', null, getAuthHeaders());
  
  // 12. 清理测试数据
  log('\n🧹 12. 清理测试数据', 'yellow');
  
  if (testDriverId && testVehicleId) {
    await testAPI('删除司机', 'DELETE', `/api/vehicles/${testVehicleId}/drivers/${testDriverId}`, null, getAuthHeaders());
  }
  
  if (testCodeId) {
    await testAPI('删除二维码', 'DELETE', `/api/codes/${testCodeId}`, null, getAuthHeaders());
  }
  
  if (testVehicleId) {
    await testAPI('删除车辆', 'DELETE', `/api/vehicles/${testVehicleId}`, null, getAuthHeaders());
  }
  
  if (testOwnerId) {
    await testAPI('删除车主', 'DELETE', `/api/owners/${testOwnerId}`, null, getAuthHeaders());
  }
  
  // 登出
  await testAPI('用户登出', 'POST', '/api/auth/logout', null, getAuthHeaders());
  
  log('\n🎉 API测试完成！', 'blue');
}

// 运行测试
runTests().catch(console.error);