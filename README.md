# Checklist Gate GitHub Action

This action ensures that pull requests cannot be merged until required checklist items in the PR description are explicitly checked.

## How It Works

The action reads the enforced checklist items from `config/checklist-items.txt`. When a pull request includes any of those labels in its description, the action verifies that each one is checked (e.g. `- [x] Label`). If any matching items remain unchecked, the action fails. The default configuration enforces the following items:

- Tests written or updated
- Documentation updated
- Product sign-off received

Checklist entries that are not present in the PR description are ignored, allowing teams to include optional checklist blocks without blocking merges when they are omitted. To customize which items are enforced, edit `config/checklist-items.txt` in this repository.

## Usage

```yaml
name: Checklist Gate

on:
  pull_request:
    types: [opened, edited, synchronize, reopened]

jobs:
  enforce-checklist:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Enforce PR checklist
        uses: ./
```

In the example above, if the pull request description contains any of the following:

```
- [ ] Tests written or updated
- [ ] Documentation updated
- [x] Product sign-off received
```

The action will fail because the first two items are present but unchecked. Once the author marks them as complete (`- [x]`), the workflow will succeed.

## Testing

Run the bundled self-tests with Node's test runner:

```bash
npm test
```

The tests temporarily replace `config/checklist-items.txt` with the single entry `Test line` and exercise several checklist permutations to ensure the action succeeds and fails appropriately. The original configuration is restored automatically at the end of the test run.
