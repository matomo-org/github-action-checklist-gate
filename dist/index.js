const fs = require('fs');

function getInput(name, { required = false } = {}) {
  const key = `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
  const value = process.env[key] ? process.env[key].trim() : '';
  if (required && !value) {
    console.error(`Input "${name}" is required but was not provided.`);
    process.exit(1);
  }
  return value;
}

function parseChecklistConfig(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function readPullRequestBody() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    console.error('GITHUB_EVENT_PATH is not set. Cannot read event payload.');
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  } catch (error) {
    console.error(`Failed to parse event payload from ${eventPath}: ${error.message}`);
    process.exit(1);
  }

  if (!payload.pull_request) {
    console.error('This action only supports pull_request events.');
    process.exit(1);
  }

  return typeof payload.pull_request.body === 'string' ? payload.pull_request.body : '';
}

function normalizeChecklistLine(line) {
  return line.trim();
}

function extractChecklistEntries(prBody) {
  return prBody.split(/\r?\n/).map((line) => line.trim());
}

function evaluateChecklist(configuredItems, checklistLines) {
  const uncheckedItems = [];

  for (const item of configuredItems) {
    const matchingLines = checklistLines.filter((line) => {
      if (!/^[*-]\s+\[[ xX]\]/.test(line)) {
        return false;
      }

      const content = normalizeChecklistLine(line.replace(/^[*-]\s+\[[ xX]\]\s*/, ''));
      return content === item;
    });

    if (matchingLines.length === 0) {
      continue;
    }

    const isChecked = matchingLines.some((line) => /\[[xX]\]/.test(line));
    if (!isChecked) {
      uncheckedItems.push(item);
    }
  }

  return uncheckedItems;
}

function main() {
  const rawConfig = getInput('checklist_lines', { required: true });
  const configuredItems = parseChecklistConfig(rawConfig);

  if (configuredItems.length === 0) {
    console.error('No checklist lines configured. Provide at least one checklist line.');
    process.exit(1);
  }

  const prBody = readPullRequestBody();
  const checklistLines = extractChecklistEntries(prBody);
  const uncheckedItems = evaluateChecklist(configuredItems, checklistLines);

  if (uncheckedItems.length > 0) {
    console.error('Pull request is missing required checklist approvals:');
    uncheckedItems.forEach((item) => console.error(`- [ ] ${item}`));
    process.exit(1);
  }

  console.log('Checklist gate passed.');
}

main();
