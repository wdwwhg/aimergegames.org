// Host coordinator. Generated code only enters a disposable, networkless container.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import http from 'node:http';

let busy = false;
http
  .createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.headers.origin) {
      res.writeHead(403);
      return res.end('{}');
    }
    if (req.method !== 'POST' || req.url !== '/validate') {
      res.writeHead(404);
      return res.end('{}');
    }
    if (busy) {
      res.writeHead(503);
      return res.end('{"error":"Validator busy"}');
    }
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 140000) {
        res.writeHead(413);
        return res.end('{}');
      }
    }
    try {
      const { code } = JSON.parse(body);
      if (typeof code !== 'string' || code.length > 131072) throw new Error();
    } catch {
      res.writeHead(400);
      return res.end('{}');
    }
    busy = true;
    const name = 'merge-check-' + randomUUID();
    const child = spawn(
      'docker',
      [
        'run',
        '--rm',
        '-i',
        '--name',
        name,
        '--network',
        'none',
        '--read-only',
        '--cap-drop',
        'ALL',
        '--security-opt',
        'no-new-privileges',
        '--pids-limit',
        '128',
        '--memory',
        '512m',
        '--cpus',
        '1',
        '--tmpfs',
        '/tmp:rw,noexec,nosuid,size=128m',
        'ai-merge-validator',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );
    let output = '',
      finished = false;
    const finish = (status, result) => {
      if (finished) return;
      finished = true;
      busy = false;
      clearTimeout(timer);
      res.writeHead(status);
      res.end(result);
    };
    const cleanup = () => {
      child.kill();
      const remove = spawn('docker', ['rm', '-f', name], { stdio: 'ignore' });
      remove.on('error', () => {});
    };
    const timer = setTimeout(() => {
      cleanup();
      finish(
        200,
        JSON.stringify({ ok: false, error: 'Game validation timed out.' })
      );
    }, 20_000);
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (output.length > 1_600_000) {
        cleanup();
        finish(200, '{"ok":false,"error":"Preview too large"}');
      }
    });
    child.stderr.resume();
    child.stdin.on('error', () => {});
    child.on('error', () =>
      finish(503, '{"ok":false,"error":"Docker validator is unavailable"}')
    );
    child.on('close', () => {
      try {
        const result = JSON.parse(output.trim());
        finish(200, JSON.stringify(result));
      } catch {
        finish(
          200,
          '{"ok":false,"error":"Game did not finish its startup checks"}'
        );
      }
    });
    child.stdin.end(body);
  })
  .listen(Number(process.env.GAME_VALIDATOR_PORT || 3002), '127.0.0.1', () =>
    console.log('Isolated validation coordinator: http://127.0.0.1:3002')
  );
