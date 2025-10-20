// 测试后端 - 简单的 SSE 流式响应服务器
// 运行: node test-backend.js

const http = require('http');
const url = require('url');

const PORT = 10001;

// 模拟 AI 回复的文本库
const responses = [
  "你好！我是 AI 助手，很高兴为你服务。",
  "当然可以！我可以帮你：\n\n1. 编写代码\n2. 解释概念\n3. 分析数据\n4. 生成可视化\n\n有什么我可以帮到你的吗？",
  "让我给你展示一个例子：\n\n```javascript\nfunction hello() {\n  console.log('Hello, World!');\n}\n```\n\n这是一个简单的 JavaScript 函数。",
  "如果你需要生成图像，可以使用 `<draw>` 标签：\n\n例如：<draw>一只可爱的小猫在草地上玩耍</draw>",
  "如果你需要可视化，可以使用 `<htmath>` 标签插入 HTML 代码。"
];

const server = http.createServer((req, res) => {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/api/v1/chat/sse') {
    const message = parsedUrl.query.message || '';
    
    console.log('收到消息:', message);

    // 设置 SSE 响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // 根据关键词选择回复
    let replyText = responses[0]; // 默认回复
    
    if (message.includes('代码') || message.includes('编程')) {
      replyText = responses[2];
    } else if (message.includes('帮') || message.includes('什么') || message.includes('功能')) {
      replyText = responses[1];
    } else if (message.includes('图') || message.includes('画')) {
      replyText = responses[3];
    } else if (message.includes('可视化') || message.includes('图表')) {
      replyText = responses[4];
    }

    // 流式发送文本（逐字发送）
    let index = 0;
    const sendInterval = setInterval(() => {
      if (index < replyText.length) {
        const char = replyText[index];
        const data = JSON.stringify({ text: char });
        res.write(data + '\n');
        index++;
      } else {
        clearInterval(sendInterval);
        res.end();
        console.log('回复完成');
      }
    }, 30); // 每 30ms 发送一个字符

    // 处理客户端断开连接
    req.on('close', () => {
      clearInterval(sendInterval);
      console.log('客户端断开连接');
    });

  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`
========================================
  测试后端服务器已启动！
========================================

  地址: http://localhost:${PORT}
  API: http://localhost:${PORT}/api/v1/chat/sse?message=你好

  现在可以在前端应用中测试聊天功能了！

  按 Ctrl+C 停止服务器
========================================
  `);
});
