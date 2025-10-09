const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const results = [];

function logResult(test, status, data, error = null) {
  const result = {
    test,
    status,
    timestamp: new Date().toISOString(),
    data: data,
    error: error
  };
  results.push(result);
  console.log(`${status === 'SUCCESS' ? '✅' : '❌'} ${test}`);
  if (error) {
    console.log(`   错误: ${error}`);
  }
}

async function testAPIs() {
  console.log('🚀 开始API接口测试...\n');

  // 1. 健康检查
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    logResult('健康检查 GET /api/health', 'SUCCESS', response.data);
  } catch (error) {
    logResult('健康检查 GET /api/health', 'FAILED', null, error.message);
  }

  // 2. 公开系统配置
  try {
    const response = await axios.get(`${BASE_URL}/api/system-config/public`);
    logResult('公开系统配置 GET /api/system-config/public', 'SUCCESS', response.data);
  } catch (error) {
    logResult('公开系统配置 GET /api/system-config/public', 'FAILED', null, error.message);
  }

  // 3. 用户注册
  let token = null;
  let userId = null;
  try {
    const registerData = {
      username: 'testuser' + Date.now(),
      email: `test${Date.now()}@example.com`,
      password: 'Test123456!',
      name: '测试用户'
    };
    
    const response = await axios.post(`${BASE_URL}/api/auth/register`, registerData);
    logResult('用户注册 POST /api/auth/register', 'SUCCESS', response.data);
    userId = response.data.user?.id;

    // 4. 用户登录
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        username: registerData.username,
        password: registerData.password
      });
      logResult('用户登录 POST /api/auth/login', 'SUCCESS', { hasToken: !!loginResponse.data.token });
      token = loginResponse.data.token;
    } catch (loginError) {
      logResult('用户登录 POST /api/auth/login', 'FAILED', null, loginError.response?.data?.message || loginError.message);
    }
  } catch (error) {
    logResult('用户注册 POST /api/auth/register', 'FAILED', null, error.response?.data?.message || error.message);
  }

  if (token) {
    const headers = { 'Authorization': `Bearer ${token}` };

    // 5. 获取当前用户信息
    try {
      const response = await axios.get(`${BASE_URL}/api/auth/me`, { headers });
      logResult('获取当前用户 GET /api/auth/me', 'SUCCESS', response.data);
    } catch (error) {
      logResult('获取当前用户 GET /api/auth/me', 'FAILED', null, error.response?.data?.message || error.message);
    }

    // 6. 用户统计
    try {
      const response = await axios.get(`${BASE_URL}/api/user/stats`, { headers });
      logResult('用户统计 GET /api/user/stats', 'SUCCESS', response.data);
    } catch (error) {
      logResult('用户统计 GET /api/user/stats', 'FAILED', null, error.response?.data?.message || error.message);
    }

    // 7. 车主管理
    let ownerId = null;
    try {
      const ownerData = {
        name: '测试车主',
        phone: '13800138000',
        email: 'owner@test.com'
      };
      const response = await axios.post(`${BASE_URL}/api/owners`, ownerData, { headers });
      logResult('创建车主 POST /api/owners', 'SUCCESS', response.data);
      ownerId = response.data.id;
    } catch (error) {
      logResult('创建车主 POST /api/owners', 'FAILED', null, error.response?.data?.message || error.message);
    }

    // 8. 获取车主列表
    try {
      const response = await axios.get(`${BASE_URL}/api/owners`, { headers });
      logResult('获取车主列表 GET /api/owners', 'SUCCESS', { count: response.data.length });
    } catch (error) {
      logResult('获取车主列表 GET /api/owners', 'FAILED', null, error.response?.data?.message || error.message);
    }

    // 9. 车辆管理
    let vehicleId = null;
    if (ownerId) {
      try {
        const vehicleData = {
          plateNumber: '京A' + Math.random().toString().slice(2, 7),
          model: '测试车型',
          color: '白色',
          ownerId: ownerId
        };
        const response = await axios.post(`${BASE_URL}/api/vehicles`, vehicleData, { headers });
        logResult('创建车辆 POST /api/vehicles', 'SUCCESS', response.data);
        vehicleId = response.data.id;
      } catch (error) {
        logResult('创建车辆 POST /api/vehicles', 'FAILED', null, error.response?.data?.message || error.message);
      }
    }

    // 10. 获取车辆列表
    try {
      const response = await axios.get(`${BASE_URL}/api/vehicles`, { headers });
      logResult('获取车辆列表 GET /api/vehicles', 'SUCCESS', { count: response.data.length });
    } catch (error) {
      logResult('获取车辆列表 GET /api/vehicles', 'FAILED', null, error.response?.data?.message || error.message);
    }

    // 11. 二维码管理
    let codeId = null;
    if (vehicleId) {
      try {
        const codeData = {
          vehicleId: vehicleId,
          type: 'TEMPORARY'
        };
        const response = await axios.post(`${BASE_URL}/api/codes`, codeData, { headers });
        logResult('创建二维码 POST /api/codes', 'SUCCESS', response.data);
        codeId = response.data.id;
      } catch (error) {
        logResult('创建二维码 POST /api/codes', 'FAILED', null, error.response?.data?.message || error.message);
      }
    }

    // 12. 获取二维码列表
    try {
      const response = await axios.get(`${BASE_URL}/api/codes`, { headers });
      logResult('获取二维码列表 GET /api/codes', 'SUCCESS', { count: response.data.length });
    } catch (error) {
      logResult('获取二维码列表 GET /api/codes', 'FAILED', null, error.response?.data?.message || error.message);
    }

    // 13. 扫码记录
    if (codeId) {
      try {
        const recordData = {
          codeId: codeId,
          scannerName: '测试扫码者',
          scannerPhone: '13900000000',
          reason: '测试扫码'
        };
        const response = await axios.post(`${BASE_URL}/api/records`, recordData);
        logResult('创建扫码记录 POST /api/records', 'SUCCESS', response.data);
      } catch (error) {
        logResult('创建扫码记录 POST /api/records', 'FAILED', null, error.response?.data?.message || error.message);
      }
    }

    // 14. 获取扫码记录
    try {
      const response = await axios.get(`${BASE_URL}/api/records`, { headers });
      logResult('获取扫码记录 GET /api/records', 'SUCCESS', { count: response.data.length });
    } catch (error) {
      logResult('获取扫码记录 GET /api/records', 'FAILED', null, error.response?.data?.message || error.message);
    }

    // 15. 通知配置
    try {
      const response = await axios.get(`${BASE_URL}/api/user/notification-config`, { headers });
      logResult('获取通知配置 GET /api/user/notification-config', 'SUCCESS', response.data);
    } catch (error) {
      logResult('获取通知配置 GET /api/user/notification-config', 'FAILED', null, error.response?.data?.message || error.message);
    }

    // 16. 管理员功能测试
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/system-config`, { headers });
      logResult('获取系统配置(管理员) GET /api/admin/system-config', 'SUCCESS', response.data);
    } catch (error) {
      logResult('获取系统配置(管理员) GET /api/admin/system-config', 'FAILED', null, error.response?.data?.message || error.message);
    }

    try {
      const response = await axios.get(`${BASE_URL}/api/admin/users`, { headers });
      logResult('获取所有用户(管理员) GET /api/admin/users', 'SUCCESS', { count: response.data.length });
    } catch (error) {
      logResult('获取所有用户(管理员) GET /api/admin/users', 'FAILED', null, error.response?.data?.message || error.message);
    }

    try {
      const response = await axios.get(`${BASE_URL}/api/admin/performance`, { headers });
      logResult('获取性能统计(管理员) GET /api/admin/performance', 'SUCCESS', response.data);
    } catch (error) {
      logResult('获取性能统计(管理员) GET /api/admin/performance', 'FAILED', null, error.response?.data?.message || error.message);
    }
  }

  // 保存测试结果
  fs.writeFileSync('api-test-results.json', JSON.stringify(results, null, 2));
  
  console.log('\n📊 测试统计:');
  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const failedCount = results.filter(r => r.status === 'FAILED').length;
  console.log(`✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${failedCount}`);
  console.log(`📝 总计: ${results.length}`);
  console.log('\n详细结果已保存到 api-test-results.json');
}

testAPIs().catch(console.error);