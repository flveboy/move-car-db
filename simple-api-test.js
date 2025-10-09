const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testBasicAPIs() {
  console.log('🚀 开始基础API测试...\n');
  
  try {
    // 1. 健康检查
    console.log('1. 测试健康检查...');
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ 健康检查:', health.data);
    
    // 2. 公开系统配置
    console.log('\n2. 测试公开系统配置...');
    const config = await axios.get(`${BASE_URL}/api/system-config/public`);
    console.log('✅ 公开系统配置:', config.data);
    
    // 3. 用户注册
    console.log('\n3. 测试用户注册...');
    const registerData = {
      username: 'testuser_' + Date.now(),
      email: 'test@example.com',
      password: 'Test123456!',
      name: '测试用户'
    };
    
    try {
      const register = await axios.post(`${BASE_URL}/api/auth/register`, registerData);
      console.log('✅ 用户注册成功:', register.data);
      
      // 4. 用户登录
      console.log('\n4. 测试用户登录...');
      const login = await axios.post(`${BASE_URL}/api/auth/login`, {
        username: registerData.username,
        password: registerData.password
      });
      console.log('✅ 用户登录成功:', { token: login.data.token ? '已获取' : '未获取' });
      
      const token = login.data.token;
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // 5. 获取当前用户信息
      console.log('\n5. 测试获取当前用户信息...');
      const me = await axios.get(`${BASE_URL}/api/auth/me`, { headers });
      console.log('✅ 当前用户信息:', me.data);
      
      // 6. 获取用户统计
      console.log('\n6. 测试用户统计...');
      const stats = await axios.get(`${BASE_URL}/api/user/stats`, { headers });
      console.log('✅ 用户统计:', stats.data);
      
      // 7. 车主管理
      console.log('\n7. 测试车主管理...');
      const ownerData = {
        name: '测试车主',
        phone: '13800138000',
        email: 'owner@test.com'
      };
      
      const createOwner = await axios.post(`${BASE_URL}/api/owners`, ownerData, { headers });
      console.log('✅ 创建车主:', createOwner.data);
      
      const owners = await axios.get(`${BASE_URL}/api/owners`, { headers });
      console.log('✅ 获取车主列表:', owners.data);
      
      // 8. 车辆管理
      console.log('\n8. 测试车辆管理...');
      const vehicleData = {
        plateNumber: '京A' + Math.random().toString().slice(2, 7),
        model: '测试车型',
        color: '白色',
        ownerId: createOwner.data.id
      };
      
      const createVehicle = await axios.post(`${BASE_URL}/api/vehicles`, vehicleData, { headers });
      console.log('✅ 创建车辆:', createVehicle.data);
      
      const vehicles = await axios.get(`${BASE_URL}/api/vehicles`, { headers });
      console.log('✅ 获取车辆列表:', vehicles.data);
      
      // 9. 二维码管理
      console.log('\n9. 测试二维码管理...');
      const codeData = {
        vehicleId: createVehicle.data.id,
        type: 'TEMPORARY'
      };
      
      const createCode = await axios.post(`${BASE_URL}/api/codes`, codeData, { headers });
      console.log('✅ 创建二维码:', createCode.data);
      
      const codes = await axios.get(`${BASE_URL}/api/codes`, { headers });
      console.log('✅ 获取二维码列表:', codes.data);
      
      // 10. 扫码记录
      console.log('\n10. 测试扫码记录...');
      const recordData = {
        codeId: createCode.data.id,
        scannerName: '测试扫码者',
        scannerPhone: '13900000000',
        reason: '测试扫码'
      };
      
      const createRecord = await axios.post(`${BASE_URL}/api/records`, recordData);
      console.log('✅ 创建扫码记录:', createRecord.data);
      
      const records = await axios.get(`${BASE_URL}/api/records`, { headers });
      console.log('✅ 获取扫码记录:', records.data);
      
      console.log('\n🎉 基础API测试完成！所有核心功能正常工作。');
      
    } catch (authError) {
      console.log('❌ 认证相关错误:', authError.response?.data || authError.message);
    }
    
  } catch (error) {
    console.log('❌ 测试出错:', error.response?.data || error.message);
  }
}

testBasicAPIs();