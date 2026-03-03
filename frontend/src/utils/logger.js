const MAX_ENTRIES = 500;
const buffer = [];

function log(category, ...args) {
  const entry = {
    ts: new Date().toISOString(),
    category,
    message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
  };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
  console.log(`%c[${category}]`, `color: ${categoryColor(category)}; font-weight: bold`, ...args);
}

function categoryColor(cat) {
  const colors = { WebRTC: '#2196F3', Socket: '#4CAF50', Media: '#FF9800', ML: '#9C27B0', UI: '#607D8B' };
  return colors[cat] || '#999';
}

const logger = {
  webrtc: (...args) => log('WebRTC', ...args),
  socket: (...args) => log('Socket', ...args),
  media: (...args) => log('Media', ...args),
  ml: (...args) => log('ML', ...args),
  ui: (...args) => log('UI', ...args),
  getBuffer: () => [...buffer],
};

if (typeof window !== 'undefined') {
  window.__engageaiLogs = () => logger.getBuffer();
}

export default logger;
