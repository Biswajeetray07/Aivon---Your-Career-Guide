const axios = require('axios');
axios.post('http://localhost:3000/api/ai/chat', {
  problemId: 'test',
  messages: [{role: 'user', content: 'EXPLAIN THIS CODE'}]
}, { timeout: 120000 })
.then(res => console.log('NextJS Success:', res.status))
.catch(err => console.error('NextJS Error:', err.message));
