const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const configPath = path.join(repoRoot, 'config', 'checklist-items.txt');
const actionEntry = path.join(repoRoot, 'dist', 'index.js');

let originalConfigContent;

// Ensure the bundled configuration only contains the test checklist item.
test.before(() => {
  originalConfigContent = fs.readFileSync(configPath, 'utf8');
  fs.writeFileSync(configPath, 'Test line\n', 'utf8');
});

// Restore the original configuration after running the self-tests.
test.after(() => {
  fs.writeFileSync(configPath, originalConfigContent, 'utf8');
});

const rawDataProvider = [
  'Test line FAIL',
  'Test line extra data FAIL',
  '[] Test line FAIL',
  '[ ] Test line FAIL',
  '[x] Test line PASS',
  '[X] Test line PASS',
];

function buildChecklistLine(template) {
  let normalized = template;

  if (normalized.startsWith('[]')) {
    normalized = normalized.replace('[]', '[ ]');
  }

  if (normalized.startsWith('[')) {
    return `- ${normalized}`;
  }

  return `- [ ] ${normalized}`;
}

for (const entry of rawDataProvider) {
  const expectation = entry.endsWith('PASS') ? 'PASS' : 'FAIL';
  const template = entry.slice(0, -expectation.length).trim();
  const checklistLine = buildChecklistLine(template);
  const prBody = `${checklistLine}\n`;

  test(`Checklist "${template}" should ${expectation}`, () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checklist-gate-'));
    const eventPath = path.join(tmpDir, 'event.json');
    const payload = {
      pull_request: {
        body: prBody,
      },
    };

    fs.writeFileSync(eventPath, JSON.stringify(payload), 'utf8');

    const result = spawnSync(process.execPath, [actionEntry], {
      env: {
        ...process.env,
        GITHUB_EVENT_PATH: eventPath,
      },
      encoding: 'utf8',
    });

    if (expectation === 'PASS') {
      assert.strictEqual(
        result.status,
        0,
        `Expected success, stdout: ${result.stdout}, stderr: ${result.stderr}`
      );
    } else {
      assert.notStrictEqual(
        result.status,
        0,
        `Expected failure but received success. stdout: ${result.stdout}, stderr: ${result.stderr}`
      );
    }
  });
}

test('Checklist item missing from PR body should FAIL', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checklist-gate-'));
  const eventPath = path.join(tmpDir, 'event.json');
  const payload = {
    pull_request: {
      body: '',
    },
  };

  fs.writeFileSync(eventPath, JSON.stringify(payload), 'utf8');

  const result = spawnSync(process.execPath, [actionEntry], {
    env: {
      ...process.env,
      GITHUB_EVENT_PATH: eventPath,
    },
    encoding: 'utf8',
  });

  assert.notStrictEqual(
    result.status,
    0,
    `Expected failure when checklist item is missing. stdout: ${result.stdout}, stderr: ${result.stderr}`
  );
});
