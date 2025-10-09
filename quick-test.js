const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function quickTest() {
  console.log('🚀 快速API测试\n');

  // 1. 健康检查
  try {
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ 健康检查:', health.data);
  } catch (e) {
    console.log('❌ 健康检查失败:', e.message);
  }

  // 2. 管理员登录
  try {
    const login = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    console.log('✅ 管理员登录成功');
    
    const token = login.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };

    // 3. 获取当前用户
    try {
      const me = await axios.get(`${BASE_URL}/api/auth/me`, { headers });
      console.log('✅ 当前用户:', me.data.name, '- 角色:', me.data.role);
    } catch (e) {
      console.log('❌ 获取用户信息失败:', e.response?.data?.message || e.message);
    }

    // 4. 获取系统配置
    try {
      const config = await axios.get(`${BASE_URL}/api/admin/system-config`, { headers });
      console.log('✅ 系统配置获取成功，配置项数量:', config.data.length);
    } catch (e) {
      console.log('❌ 获取系统配置失败:', e.response?.data?.message || e.message);
    }

    // 5. 车主列表
    try {
      const owners = await axios.get(`${BASE_URL}/api/owners`, { headers });
      console.log('✅ 车主列表获取成功，数量:', owners.data.length);
    } catch (e) {
      console.log('❌ 获取车主列表失败:', e.response?.data?.message || e.message);
    }

    // 6. 车辆列表
    try {
      const vehicles = await axios.get(`${BASE_URL}/api/vehicles`, { headers });
      console.log('✅ 车辆列表获取成功，数量:', vehicles.data.length);
    } catch (e) {
      console.log('❌ 获取车辆列表失败:', e.response?.data?.message || e.message);
    }

    // 7. 二维码列表
    try {
      const codes = await axios.get(`${BASE_URL}/api/codes`, { headers });
      console.log('✅ 二维码列表获取成功，数量:', codes.data.length);
    } catch (e) {
      console.log('❌ 获取二维码列表失败:', e.response?.data?.message || e.message);
    }

    // 8. 扫码记录
    try {
      const records = await axios.get(`${BASE_URL}/api/records`, { headers });
      console.log('✅ 扫码记录获取成功，数量:', records.data.length);
    } catch (e) {
      console.log('❌ 获取扫码记录失败:', e.response?.data?.message || e.message);
    }

    // 9. 用户统计
    try {
      const stats = await axios.get(`${BASE_URL}/api/user/stats`, { headers });
      console.log('✅ 用户统计获取成功:', stats.data);
    } catch (e) {
      console.log('❌ 获取用户统计失败:', e.response?.data?.message || e.message);
    }

    // 10. 所有用户列表（管理员）
    try {
      const users = await axios.get(`${BASE_URL}/api/admin/users`, { headers });
      console.log('✅ 所有用户列表获取成功，数量:', users.data.length);
    } catch (e) {
      console.log('❌ 获取用户列表失败:', e.response?.data?.message || e.message);
    }

  } catch (e) {
    console.log('❌ 管理员登录失败:', e.response?.data?.message || e.message);
  }

  console.log('\n🎉 快速测试完成！');
}

quickTest();