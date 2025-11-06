const {describe, it, before, after} = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const checklistItemsConfigPath = path.join(repoRoot, 'config', 'checklist-items.txt');
const excludedUsersConfigPath = path.join(repoRoot, 'config', 'excluded-users.txt');
const actionEntry = path.join(repoRoot, 'dist', 'index.js');

let originalChecklistItemsContent;
let originalExcludedUsersContent;

describe('Checklist Gate GitHub Action', () => {
  before(() => {
    // Ensure the bundled configuration only contains the test checklist item.
    originalChecklistItemsContent = fs.readFileSync(checklistItemsConfigPath, 'utf8');
    fs.writeFileSync(checklistItemsConfigPath, 'Test line\n', 'utf8');

    originalExcludedUsersContent = fs.readFileSync(excludedUsersConfigPath, 'utf8');
    fs.writeFileSync(excludedUsersConfigPath, 'dependabot[bot]\n', 'utf8');
  });

  after(() => {
    // Restore the original configuration after running the self-tests.
    fs.writeFileSync(checklistItemsConfigPath, originalChecklistItemsContent, 'utf8');
    fs.writeFileSync(excludedUsersConfigPath, originalExcludedUsersContent, 'utf8');
  });

  it('Checklist status permutations', () => {
    // Exercise every accepted status along with representative invalid inputs.
    const scenarios = [
      {line: '- [✔] Test line', expectation: 'PASS'},
      {line: '- [✖] Test line', expectation: 'PASS'},
      {line: '- [NA] Test line', expectation: 'PASS'},
      {line: '- [Na] Test line', expectation: 'PASS'},
      {line: '- [na] Test line', expectation: 'PASS'},
      {line: '- [x] Test line', expectation: 'FAIL'},
      {line: '- [ ] Test line', expectation: 'FAIL'},
      {line: '- [] Test line', expectation: 'FAIL'},
      {line: '- [pending] Test line', expectation: 'FAIL'},
      {line: '- Test line', expectation: 'FAIL'},
    ];

    for (const {line, expectation} of scenarios) {
      const prBody = `${line}\n`;
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checklist-gate-'));
      const eventPath = path.join(tmpDir, 'event.json');
      const payload = {pull_request: {body: prBody}};

      fs.writeFileSync(eventPath, JSON.stringify(payload), 'utf8');

      const result = spawnSync(process.execPath, [actionEntry], {
        env: {...process.env, GITHUB_EVENT_PATH: eventPath},
        encoding: 'utf8',
      });

      if (expectation === 'PASS') {
        assert.strictEqual(
          result.status,
          0,
          `Scenario "${line}" expected PASS, stdout: ${result.stdout}, stderr: ${result.stderr}`
        );
      } else {
        assert.notStrictEqual(
          result.status,
          0,
          `Scenario "${line}" expected FAIL but exited 0. stdout: ${result.stdout}, stderr: ${result.stderr}`
        );
      }
    }
  });

  it('Checklist handles multi-line PR bodies', () => {
    const prBody = [
      'Summary of changes',
      '- plain bullet without brackets',
      '- [✔] Test line',
      'Follow-up notes and links',
    ].join('\n');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checklist-gate-'));
    const eventPath = path.join(tmpDir, 'event.json');
    const payload = {pull_request: {body: prBody}};

    fs.writeFileSync(eventPath, JSON.stringify(payload), 'utf8');

    const result = spawnSync(process.execPath, [actionEntry], {
      env: {...process.env, GITHUB_EVENT_PATH: eventPath},
      encoding: 'utf8',
    });

    assert.strictEqual(
      result.status,
      0,
      `Expected mixed-content PR body to pass. stdout: ${result.stdout}, stderr: ${result.stderr}`
    );
  });

  it('Checklist item missing from PR body should FAIL', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checklist-gate-'));
    const eventPath = path.join(tmpDir, 'event.json');
    const payload = {pull_request: {body: ''}};

    fs.writeFileSync(eventPath, JSON.stringify(payload), 'utf8');

    const result = spawnSync(process.execPath, [actionEntry], {
      env: {...process.env, GITHUB_EVENT_PATH: eventPath},
      encoding: 'utf8',
    });

    assert.notStrictEqual(
      result.status,
      0,
      `Expected failure when checklist item is missing. stdout: ${result.stdout}, stderr: ${result.stderr}`
    );
  });

  it('Gate check skipped for excluded user', () => {
    const prBody = [
      'Irrelevant PR body',
      'No checklist',
    ].join('\n');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checklist-gate-'));
    const eventPath = path.join(tmpDir, 'event.json');
    const payload = {
      pull_request: {
        body: prBody,
        user: {login: 'dependabot[bot]'}
      },
    };

    fs.writeFileSync(eventPath, JSON.stringify(payload), 'utf8');

    const result = spawnSync(process.execPath, [actionEntry], {
      env: {...process.env, GITHUB_EVENT_PATH: eventPath},
      encoding: 'utf8',
    });

    assert.strictEqual(
      result.status,
      0,
      `Expected PR created by excluded user skipping the gate to pass. stdout: ${result.stdout}, stderr: ${result.stderr}`
    );
  });
});
