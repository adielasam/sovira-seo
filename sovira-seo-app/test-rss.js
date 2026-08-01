async function test() {
  const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
  const ids = await res.json();
  const top5 = ids.slice(0, 5);
  
  for (const id of top5) {
    const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
    const item = await itemRes.json();
    console.log(item.title);
  }
}
test();
