// Automated verification test script for AntiEnglish Web backend API
const assert = require('assert');

async function runTests() {
  console.log('--- Starting Backend Verification Tests ---');
  const baseUrl = 'http://localhost:5000/api';

  // 1. Health check
  const healthRes = await fetch(`${baseUrl}/health`);
  const healthData = await healthRes.json();
  console.log('✓ Health check passed:', healthData.status);
  assert.strictEqual(healthData.status, 'ok');

  // 2. Login with seeded demo user
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'demo', password: '123' }) // demo password was 123456
  });
  
  // Try 123456
  const loginRes2 = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'demo', password: '123456' })
  });
  const loginData = await loginRes2.json();
  console.log('✓ Login demo user status:', loginRes2.status);
  assert.strictEqual(loginRes2.status, 200);
  assert.ok(loginData.token);
  const token = loginData.token;

  // 3. Get folders
  const foldersRes = await fetch(`${baseUrl}/folders`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  let folders = await foldersRes.json();
  if (folders.length < 2) {
    await fetch(`${baseUrl}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: 'Thư mục bổ sung ' + Date.now() })
    });
    const refreshed = await fetch(`${baseUrl}/folders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    folders = await refreshed.json();
  }
  console.log('✓ Fetched folders count:', folders.length);
  assert.ok(folders.length >= 2, 'Should have at least 2 folders');

  const f1 = folders[0];
  const f2 = folders[1];
  console.log(`  Folder 1: "${f1.name}" (${f1.card_count} cards)`);
  console.log(`  Folder 2: "${f2.name}" (${f2.card_count} cards)`);

  // 4. Create two specific test folders to test Folder Merge cleanly
  console.log('Testing Folder Merge feature with 2 fresh test folders...');
  const tf1Res = await fetch(`${baseUrl}/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name: `Test Folder A ${Date.now()}` })
  });
  const tf1 = (await tf1Res.json()).folder;

  const tf2Res = await fetch(`${baseUrl}/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name: `Test Folder B ${Date.now()}` })
  });
  const tf2 = (await tf2Res.json()).folder;

  // Add 2 cards to Folder A
  await fetch(`${baseUrl}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ folder_id: tf1.id, word: 'serendipity', meaning: 'sự tình cờ may mắn' })
  });
  await fetch(`${baseUrl}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ folder_id: tf1.id, word: 'ephemeral', meaning: 'phù du, chóng tàn' })
  });

  // Add 2 cards to Folder B (one unique, one duplicate to test deduplication)
  await fetch(`${baseUrl}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ folder_id: tf2.id, word: 'serendipity', meaning: 'sự may mắn bất ngờ' }) // duplicate!
  });
  await fetch(`${baseUrl}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ folder_id: tf2.id, word: 'resilient', meaning: 'kiên cường' }) // unique!
  });

  const mergeRes = await fetch(`${baseUrl}/folders/merge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      source_folder_ids: [tf1.id, tf2.id],
      create_new_folder: true,
      new_folder_name: `Gộp Thư Mục Test ${Date.now()}`,
      new_folder_desc: 'Kiểm tra gộp và loại trùng',
      delete_source: false,
      deduplicate: true
    })
  });
  const mergeData = await mergeRes.json();
  console.log('✓ Merge result:', mergeData.message);
  assert.strictEqual(mergeRes.status, 200);
  assert.ok(mergeData.target_folder);
  // tf1 has 2 cards, tf2 has 1 duplicate + 1 unique -> total merged should be 3 unique cards!
  assert.strictEqual(mergeData.moved_count, 3);
  assert.strictEqual(mergeData.skipped_count, 1);
  console.log(`  Merged successfully: 3 unique cards transferred, 1 duplicate safely skipped!`);

  // 5. Test Practice generation for fill_meaning
  console.log('Testing Practice Question Generation...');
  const fWithCards = folders.find(f => (f.card_count || 0) >= 2) || mergeData.target_folder || f1;
  const practiceRes = await fetch(`${baseUrl}/practice/questions?folder_id=${fWithCards.id}&limit=5&mode=fill_meaning`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const practiceData = await practiceRes.json();
  console.log(`✓ Generated ${practiceData.questions.length} questions for folder ${fWithCards.name}`);
  assert.strictEqual(practiceRes.status, 200);
  assert.ok(practiceData.questions.length > 0);

  // 6. Test Practice Answer Checking
  const sampleQ = practiceData.questions[0];
  console.log(`Testing answer check for word: "${sampleQ.word}", true meaning: "${sampleQ.meaning}"`);
  const checkRes = await fetch(`${baseUrl}/practice/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      card_id: sampleQ.id,
      user_answer: sampleQ.meaning.split(',')[0].trim(),
      mode: 'fill_meaning'
    })
  });
  const checkData = await checkRes.json();
  console.log('✓ Answer check is_correct:', checkData.is_correct);
  assert.strictEqual(checkData.is_correct, true);

  // 7. Test Submit practice session
  const submitRes = await fetch(`${baseUrl}/practice/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      folder_id: f1.id,
      score: 4,
      total_questions: 5,
      mode: 'fill_meaning'
    })
  });
  const submitData = await submitRes.json();
  console.log('✓ Practice submission score recorded:', submitData.score, '/', submitData.total_questions, `(${submitData.accuracy}%)`);
  assert.strictEqual(submitRes.status, 201);

  console.log('\n🎉 ALL BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
