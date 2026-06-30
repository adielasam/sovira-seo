async function run() {
  const res = await fetch('https://sovira-seo.vercel.app/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }], pathname: '/' })
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}
run();
