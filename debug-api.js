const { PrismaClient } = require('@prisma/client');

// Import the same way as the API route
const db = new PrismaClient({
  log: ['query'],
});

async function debugAPI() {
  try {
    console.log('Debugging API route logic...');
    
    const validatedData = {
      phone: '13900139000',
      name: 'API Test User',
      email: 'apitest@example.com',
      password: 'testpass123'
    };
    
    console.log('Step 1: Check if phone exists...');
    
    // This is the exact same code as in the API route
    const existingUser = await db.owner.findUnique({
      where: { phone: validatedData.phone }
    });
    
    console.log('Existing user:', existingUser);
    
    if (existingUser) {
      console.log('User already exists');
      return;
    }
    
    console.log('Step 2: Hash password...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);
    
    console.log('Step 3: Create user...');
    const user = await db.owner.create({
      data: {
        phone: validatedData.phone,
        name: validatedData.name,
        email: validatedData.email || null,
        password: hashedPassword,
        role: 'USER'
      }
    });
    
    console.log('Created user:', user);
    
    console.log('✅ Debug test successful!');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  } finally {
    await db.$disconnect();
  }
}

debugAPI().catch(console.error);