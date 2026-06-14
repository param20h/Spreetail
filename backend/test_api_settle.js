process.env.PORT = 5002;
const request = require('supertest');
const app = require('./server');
const db = require('./src/config/database');

async function run() {
  try {
    console.log('--- Testing Settlement API Endpoint ---');
    
    // 1. Get a user token by logging in
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'aisha@flatmate.com',
        password: 'password123'
      });
    
    const token = loginRes.body.token;
    console.log('Login successful, token retrieved:', token ? 'Yes' : 'No');

    if (!token) {
      console.log('Login failed:', loginRes.body);
      return;
    }

    const groupId = '81adf26a-648c-4ef8-9827-533e711e6353'; // group "prime"

    // 2. Post a settlement
    const res = await request(app)
      .post(`/api/groups/${groupId}/settlements`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        paid_by: '22222222-2222-2222-2222-222222222222', // Rohan
        paid_to: '11111111-1111-1111-1111-111111111111', // Aisha
        amount: 50.00,
        date: '2026-06-14',
        notes: 'API test settlement'
      });

    console.log('Response Status:', res.status);
    console.log('Response Body:', res.body);

  } catch (err) {
    console.error('API Test Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
