const https = require('https');

https.get('https://sovira.com.ng/blog/write-like-pro-using-sovira-ai', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Contains overflow-hidden on article?', data.includes('lg:max-w-[800px] min-w-0 overflow-hidden'));
    console.log('Contains replace regex?', data.includes('dangerouslySetInnerHTML'));
  });
});
