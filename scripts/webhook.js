#!/usr/bin/env node
/**
 * HRMS — GitHub Webhook Deploy Server
 * GitHub push bo'lganda avtomatik git pull + deploy.sh ishga tushiradi.
 *
 * O'rnatish: scripts/setup-webhook.sh
 * Log:       journalctl -u hrms-webhook -f
 */

const http = require('http');
const crypto = require('crypto');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Sozlamalar ─────────────────────────────────────────────────────────────
const PORT          = process.env.WEBHOOK_PORT   || 9000;
const SECRET        = process.env.WEBHOOK_SECRET || '';      // GitHub Webhook Secret
const DEPLOY_BRANCH = process.env.DEPLOY_BRANCH  || 'main'; // qaysi branch
const REPO_DIR      = process.env.REPO_DIR       || path.resolve(__dirname, '..');
const LOG_FILE      = process.env.LOG_FILE        || '/var/log/hrms-deploy.log';

// ── Log yozish ─────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try { fs.appendFileSync(LOG_FILE, line); } catch (_) {}
}

// ── GitHub imzosini tekshirish ──────────────────────────────────────────────
function verifySignature(payload, signature) {
  if (!SECRET) return true; // Secret yo'q bo'lsa tekshirmasdan o'tkazamiz
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payload);
  const expected = `sha256=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ── Fon deploy jarayoni ────────────────────────────────────────────────────
let isDeploying = false;

function runDeploy() {
  if (isDeploying) {
    log('⚠️  Deploy allaqachon bajarilmoqda, navbatga olinmadi.');
    return;
  }
  isDeploying = true;
  log('🚀 Deploy boshlandi...');

  const child = spawn('bash', ['-lc', `
    set -e
    cd "${REPO_DIR}"
    echo "==> git pull..."
    git pull --ff-only
    echo "==> npm install (agar package.json o'zgarsa)..."
    npm install --prefer-offline 2>&1 || true
    echo "==> Docker build & restart..."
    NO_PULL=1 bash ./scripts/deploy.sh
    echo "==> ✅ Deploy tugadi!"
  `], {
    env: { ...process.env, PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const writeLog = (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach(l => log(`  | ${l}`));
  };

  child.stdout.on('data', writeLog);
  child.stderr.on('data', writeLog);

  child.on('close', (code) => {
    isDeploying = false;
    if (code === 0) {
      log(`✅ Deploy muvaffaqiyatli tugadi (exit 0).`);
    } else {
      log(`❌ Deploy XATO bilan tugadi (exit ${code}). Log: ${LOG_FILE}`);
    }
  });
}

// ── HTTP Server ────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // Sog'lik tekshiruvi
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', deploying: isDeploying }));
    return;
  }

  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    // Imzoni tekshir
    const sig = req.headers['x-hub-signature-256'];
    if (!verifySignature(body, sig)) {
      log(`⛔ Noto'g'ri webhook imzosi. Rad etildi.`);
      res.writeHead(401);
      res.end('Unauthorized');
      return;
    }

    let payload;
    try { payload = JSON.parse(body); } catch (_) {
      res.writeHead(400);
      res.end('Bad JSON');
      return;
    }

    const ref    = payload.ref || '';
    const branch = ref.replace('refs/heads/', '');
    const repo   = payload.repository?.full_name || '?';
    const pusher = payload.pusher?.name || '?';

    log(`📩 Webhook keldi: repo=${repo}, branch=${branch}, pusher=${pusher}`);

    if (branch !== DEPLOY_BRANCH) {
      log(`ℹ️  Branch '${branch}' deploy branch emas ('${DEPLOY_BRANCH}'). O'tkazib yuborildi.`);
      res.writeHead(200);
      res.end(`Skipped: not ${DEPLOY_BRANCH}`);
      return;
    }

    res.writeHead(202);
    res.end('Deploy started');
    runDeploy();
  });
});

server.listen(PORT, () => {
  log(`🟢 Webhook server ishga tushdi: http://0.0.0.0:${PORT}/webhook`);
  log(`   Branch: ${DEPLOY_BRANCH} | Repo: ${REPO_DIR}`);
  log(`   Secret: ${SECRET ? '✅ o\'rnatilgan' : '⚠️  o\'rnatilmagan (tavsiya etilmaydi)'}`);
});

process.on('SIGTERM', () => { log('SIGTERM, server to\'xtatilmoqda...'); server.close(); });
process.on('SIGINT',  () => { log('SIGINT, server to\'xtatilmoqda...');  server.close(); });
