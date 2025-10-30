const fs = require('fs');
const path = require('path');

// Parse newline-delimited checklist configuration into trimmed entries.
function parseChecklistConfig(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// Load enforced checklist items from the bundled config file.
function loadConfiguredItems() {
  const configPath = path.resolve(__dirname, '../config/checklist-items.txt');
  let raw;
  try {
    raw = fs.readFileSync(configPath, 'utf8');
  } catch (error) {
    console.error(`Failed to read checklist config at ${configPath}: ${error.message}`);
    process.exit(1);
  }

  const configuredItems = parseChecklistConfig(raw);
  if (configuredItems.length === 0) {
    console.error(`Checklist config at ${configPath} is empty. Add at least one checklist line.`);
    process.exit(1);
  }

  return configuredItems;
}

// Read and validate the pull request body from the event payload.
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

// Extract checklist candidates line-by-line from the PR description.
function extractChecklistEntries(prBody) {
  return prBody.split(/\r?\n/).map((line) => line.trim());
}

// Parse a Markdown checklist line into a structured record or null if unsupported.
function parseChecklistLine(line) {
  if (!(line.startsWith('- [') || line.startsWith('* ['))) {
    return null;
  }

  const statusChar = line.charAt(3);
  if (!['x', 'X', ' '].includes(statusChar)) {
    return null;
  }

  const closingBracketIndex = line.indexOf(']');
  if (closingBracketIndex === -1) {
    return null;
  }

  const label = line.slice(closingBracketIndex + 1).trim();
  if (!label) {
    return null;
  }

  const checked = statusChar === 'x' || statusChar === 'X';
  return { label, checked };
}

// Inspect PR checklist lines against the enforced items and collect failures.
function evaluateChecklist(configuredItems, checklistLines) {
  const uncheckedItems = [];
  const missingItems = [];

  for (const item of configuredItems) {
    const matches = checklistLines
      .map((line) => parseChecklistLine(line))
      .filter((entry) => entry && entry.label === item);

    if (matches.length === 0) {
      missingItems.push(item);
      continue;
    }

    const isChecked = matches.some((entry) => entry.checked);
    if (!isChecked) {
      uncheckedItems.push(item);
    }
  }

  return { missingItems, uncheckedItems };
}

// Emit a GitHub workflow error annotation for visibility in the Checks UI.
function emitErrorAnnotation(message) {
  console.error(`::error title=Checklist Gate::${message}`);
}

// Entrypoint for the action: load config, evaluate PR body, and fail if needed.
function main() {
  const configuredItems = loadConfiguredItems();
  const prBody = readPullRequestBody();
  const checklistLines = extractChecklistEntries(prBody);
  const { missingItems, uncheckedItems } = evaluateChecklist(configuredItems, checklistLines);

  if (missingItems.length > 0 || uncheckedItems.length > 0) {
    if (missingItems.length > 0) {
      console.error('Pull request is missing required checklist items:');
      missingItems.forEach((item) => {
        console.error(`- ${item}`);
        emitErrorAnnotation(`Checklist item not present in PR body: ${item}`);
      });
    }

    if (uncheckedItems.length > 0) {
      console.error('Pull request has unchecked required checklist items:');
      uncheckedItems.forEach((item) => {
        console.error(`- [ ] ${item}`);
        emitErrorAnnotation(`Checklist item present but unchecked: ${item}`);
      });
    }

    process.exit(1);
  }

  console.log('Checklist gate passed.');
}

main();
