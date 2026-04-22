require('dotenv').config();
const dns = require('dns');

// Force Google DNS to bypass ISP SRV block
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4']);

const srvHost = 'workercluster.jilumzl.mongodb.net';

console.log('🔍 Resolving MongoDB Atlas shards via Google DNS...\n');

resolver.resolveSrv(`_mongodb._tcp.${srvHost}`, (err, addresses) => {
  if (err) {
    console.error('❌ SRV lookup failed even with Google DNS:', err.message);
    console.log('\n💡 Try: Change your Windows DNS to 8.8.8.8 in Network Settings, then run this again.');
    return;
  }

  const hosts = addresses.map(a => `${a.name}:${a.port}`).join(',');
  console.log('✅ Resolved shards:', addresses.map(a => a.name));

  resolver.resolveTxt(srvHost, (err2, txtRecords) => {
    let authSource = 'admin';
    let replicaSet = '';

    if (!err2 && txtRecords) {
      const txt = txtRecords.flat().join('&');
      const authMatch = txt.match(/authSource=([^&]+)/);
      if (authMatch) authSource = authMatch[1];
      const rsMatch = txt.match(/replicaSet=([^&]+)/);
      if (rsMatch) replicaSet = rsMatch[1];
    }

    // Get password from .env
    const currentUri = process.env.MONGO_URI || '';
    const pwMatch = currentUri.match(/:([^@]+)@/);
    const password = pwMatch ? pwMatch[1] : 'YOUR_PASSWORD_HERE';

    const uri = `mongodb://admin:${password}@${hosts}/workerhub?ssl=true${replicaSet ? `&replicaSet=${replicaSet}` : ''}&authSource=${authSource}&retryWrites=true&w=majority`;

    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║  COPY THIS INTO YOUR .env as MONGO_URI:                          ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log(uri);
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  });
});
