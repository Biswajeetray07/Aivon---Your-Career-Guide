const axios = require('axios');
axios.post('http://localhost:3000/api/ai/chat', {
  problemId: 'cm6x4r04m000213dndx6fntc9',
  messages: [{role: 'user', content: 'EXPLAIN THIS CODE'}],
  language: 'python'
}, { headers: { Authorization: `Bearer ${process.env.TEST_TOKEN || ''}` }})
.then(res => console.log('Success:', res.data.reply))
.catch(err => console.error('Error:', err.response?.data || err.message));
