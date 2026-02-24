const axios = require('axios');
axios.post('http://127.0.0.1:11434/api/chat', {
  model: 'qwen3:8b',
  messages: [{role: 'user', content: 'Give me the full python solution to the two sum problem.'}],
  stream: false,
  options: { num_predict: 1500 }
}).then(res => console.log('Ollama Success:', res.data.message.content.substring(0, 100)))
  .catch(err => console.error('Ollama Error:', err.message));
