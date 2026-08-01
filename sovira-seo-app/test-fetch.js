const https = require('https');

https.get('https://www.sovira.com.ng/blog/write-like-pro-using-sovira-ai', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Contains max-w-[100%]?', data.includes('max-w-[100%]'));
    console.log('Contains flex layout?', data.includes('flex-1 w-full lg:max-w-[800px]'));
  });
});
