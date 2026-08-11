(function() {
  // Find the script tag that loaded this script to extract the bot ID
  const scripts = document.getElementsByTagName('script');
  let botId = null;
  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].src.includes('widget.js') && scripts[i].getAttribute('data-bot-id')) {
      botId = scripts[i].getAttribute('data-bot-id');
      break;
    }
  }

  if (!botId) {
    console.error('Sovira Bot Error: Missing data-bot-id attribute on script tag.');
    return;
  }

  // Create the iframe container
  const container = document.createElement('div');
  container.id = 'sovira-bot-container';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '999999';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'flex-end';
  container.style.fontFamily = 'sans-serif';

  // Create the iframe
  const iframe = document.createElement('iframe');
  // Determine host dynamically (in case of local testing)
  const host = new URL(document.currentScript ? document.currentScript.src : 'https://sovira.com.ng').origin;
  iframe.src = host + '/bots/' + botId;
  iframe.style.width = '350px';
  iframe.style.height = '500px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '12px';
  iframe.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
  iframe.style.marginBottom = '16px';
  iframe.style.display = 'none'; // hidden initially
  iframe.style.opacity = '0';
  iframe.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  iframe.style.transform = 'translateY(20px)';

  // Create the toggle button
  const button = document.createElement('button');
  button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  button.style.width = '60px';
  button.style.height = '60px';
  button.style.borderRadius = '50%';
  button.style.backgroundColor = '#2563eb'; // Will be overridden by iframe message if needed
  button.style.color = '#ffffff';
  button.style.border = 'none';
  button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  button.style.cursor = 'pointer';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.transition = 'transform 0.2s ease';

  button.onmouseover = () => button.style.transform = 'scale(1.05)';
  button.onmouseout = () => button.style.transform = 'scale(1)';

  let isOpen = false;

  button.onclick = () => {
    isOpen = !isOpen;
    if (isOpen) {
      iframe.style.display = 'block';
      setTimeout(() => {
        iframe.style.opacity = '1';
        iframe.style.transform = 'translateY(0)';
      }, 10);
      button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    } else {
      iframe.style.opacity = '0';
      iframe.style.transform = 'translateY(20px)';
      setTimeout(() => {
        iframe.style.display = 'none';
      }, 300);
      button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    }
  };

  // Listen for messages from the iframe (e.g., to set the theme color)
  window.addEventListener('message', (event) => {
    if (event.origin !== host) return;
    if (event.data && event.data.type === 'SET_THEME' && event.data.color) {
      button.style.backgroundColor = event.data.color;
    }
  });

  container.appendChild(iframe);
  container.appendChild(button);
  document.body.appendChild(container);
})();
