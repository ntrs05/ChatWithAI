#!/usr/bin/env node
/**
 * Kiểm tra tự động các quy tắc kiến trúc (chạy: npm run check:arch)
 *
 *  MODULAR MONOLITH
 *   R1. Module A chỉ được import module B qua public API: '@/modules/B' (không import sâu).
 *   R2. Không import tương đối vượt ra ngoài module của mình.
 *   R3. shared/ là shared kernel → không phụ thuộc vào modules/, app/, mock-backend/.
 *   R4. modules/ không phụ thuộc vào app/ (composition root).
 *
 *  LAYERED (bên trong mỗi module)
 *   R5. domain/          → không import application / infrastructure / presentation, React, Zustand, HTTP, realtime.
 *   R6. application/     → không import presentation / infrastructure.
 *   R7. presentation/    → không import infrastructure.
 *   R8. '@/mock-backend' → chỉ được dùng trong <module>/infrastructure/ và app/bootstrap.ts.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g;
const LAYERS = ['domain', 'application', 'infrastructure', 'presentation'];

/** Chuẩn hoá import thành đường dẫn tương đối với src (vd: modules/chat/domain/rules) */
function resolveSpecifier(fromFile, spec) {
  if (spec.startsWith('@/')) return spec.slice(2);
  if (spec.startsWith('.')) return relative(src, resolve(dirname(fromFile), spec)).split(sep).join('/');
  return null; // thư viện npm
}

function describe(path) {
  const parts = path.split('/');
  if (parts[0] === 'modules') return { area: 'modules', module: parts[1], layer: LAYERS.includes(parts[2]) ? parts[2] : null, rest: parts.slice(2) };
  return { area: parts[0], module: null, layer: null, rest: parts.slice(1) };
}

const violations = [];
const files = walk(src);

for (const file of files) {
  const rel = relative(src, file).split(sep).join('/');
  const from = describe(rel);
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2];
    const report = (rule, msg) => violations.push(`${rule}  ${rel}\n      import '${spec}' — ${msg}`);

    // Quy tắc với thư viện npm trong tầng domain
    if (from.layer === 'domain' && /^(react|react-dom|zustand|socket\.io-client)(\/|$)/.test(spec)) {
      report('R5', 'domain phải thuần, không phụ thuộc framework');
      continue;
    }

    const target = resolveSpecifier(file, spec);
    if (!target) continue;
    const to = describe(target);

    if (from.area === 'shared' && ['modules', 'app', 'mock-backend'].includes(to.area)) report('R3', 'shared không được phụ thuộc vào tầng trên');
    if (from.area === 'modules' && to.area === 'app') report('R4', 'module không được phụ thuộc vào app/');
    if (to.area === 'mock-backend' && from.area !== 'mock-backend') {
      const allowed = (from.area === 'modules' && from.layer === 'infrastructure') || rel === 'app/bootstrap.ts';
      if (!allowed) report('R8', 'chỉ tầng infrastructure / bootstrap được dùng backend giả lập');
    }

    if (from.area === 'modules' && to.area === 'modules') {
      if (to.module !== from.module) {
        if (spec.startsWith('.')) report('R2', 'import tương đối sang module khác');
        else if (to.rest.length > 0) report('R1', `chỉ được import '@/modules/${to.module}' (public API)`);
        continue;
      }
      // Cùng module → kiểm tra tầng
      if (from.layer === 'domain' && to.layer && to.layer !== 'domain') report('R5', `domain không được import ${to.layer}`);
      if (from.layer === 'domain' && to.rest[0] === 'module') report('R5', 'domain không được import module.ts');
      if (from.layer === 'application' && (to.layer === 'presentation' || to.layer === 'infrastructure'))
        report('R6', `application không được import ${to.layer}`);
      if (from.layer === 'presentation' && to.layer === 'infrastructure') report('R7', 'presentation không được import infrastructure');
    }
    if (from.layer === 'domain' && to.area === 'shared' && /^(http|realtime|event-bus)/.test(to.rest[0] ?? '')) {
      report('R5', 'domain không được phụ thuộc HTTP / realtime / event bus');
    }
  }
}

const modules = [...new Set(files.map((f) => describe(relative(src, f).split(sep).join('/'))).filter((d) => d.area === 'modules').map((d) => d.module))];
console.log(`Đã kiểm tra ${files.length} tệp · ${modules.length} module: ${modules.join(', ')}`);
if (violations.length) {
  console.error(`\n✖ ${violations.length} vi phạm kiến trúc:\n`);
  violations.forEach((v) => console.error('  ' + v));
  process.exit(1);
}
console.log('✔ Không có vi phạm: Layered + Modular Monolith được tuân thủ.');
