async function test() {
  const url = encodeURIComponent('https://trends.google.com/trends/api/realtimetrends?hl=en-US&tz=-60&cat=all&fi=0&fs=0&geo=US&ri=300&rs=20&sort=0');
  const res = await fetch(`https://api.allorigins.win/get?url=${url}`);
  const data = await res.json();
  console.log(data.contents.substring(0, 500));
}

test();
