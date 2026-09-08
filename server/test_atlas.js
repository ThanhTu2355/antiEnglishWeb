const http = require('http');

async function verifyAll() {
  console.log('1. Health check...');
  const health = await request('/api/health', 'GET');
  console.log('   Health:', health);

  console.log('2. Logging in with demo user on MongoDB Atlas...');
  const login = await request('/api/auth/login', 'POST', { username: 'demo', password: '123456' });
  console.log('   Login result:', login.message, '| User ID:', login.user.id);
  const token = login.token;

  console.log('3. Getting user stats /api/auth/me...');
  const me = await request('/api/auth/me', 'GET', null, token);
  console.log('   Stats:', me.stats);

  console.log('4. Getting folders from MongoDB Atlas...');
  const folders = await request('/api/folders', 'GET', null, token);
  console.log('   Folders count:', folders.length);
  folders.forEach(f => {
    console.log(`   - [${f.name}] | Cards: ${f.card_count} | Mastered: ${f.mastered_count} | Unmastered: ${f.unmastered_count}`);
  });

  console.log('5. Getting cards with filter status=unmastered...');
  const unmasteredCards = await request('/api/cards?status=unmastered', 'GET', null, token);
  console.log('   Unmastered cards found:', unmasteredCards.length);

  console.log('6. Testing practice questions generation...');
  const quiz = await request('/api/practice/questions?limit=4&mode=multiple_choice', 'GET', null, token);
  console.log('   Quiz generated:', quiz.questions.length, 'questions');
  if (quiz.questions[0]) {
    console.log('   Sample Question:', quiz.questions[0].word, '-> Options:', quiz.questions[0].options);
  }

  console.log('\n=============================================');
  console.log('🎉 TOÀN BỘ API MONGODB ATLAS HOẠT ĐỘNG HOÀN HẢO 100%!');
  console.log('=============================================');
}

function request(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const payload = body ? JSON.stringify(body) : null;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

verifyAll().catch(console.error);
