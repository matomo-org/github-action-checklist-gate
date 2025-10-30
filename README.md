# Checklist Gate GitHub Action

This action ensures that pull requests cannot be merged until required checklist items in the PR description are explicitly checked.

## How It Works

Provide a newline-separated list of checklist labels. When a pull request includes any of those labels in its description, the action verifies that each one is checked (e.g. `- [x] Label`). If any matching items remain unchecked, the action fails.

Checklist entries that are not present in the PR description are ignored, allowing teams to include optional checklist blocks without blocking merges when they are omitted.

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
        with:
          checklist_lines: |
            Tests written or updated
            Documentation updated
            Product sign-off received
```

In the example above, if the pull request description contains any of the following:

```
- [ ] Tests written or updated
- [ ] Documentation updated
- [x] Product sign-off received
```

The action will fail because the first two items are present but unchecked. Once the author marks them as complete (`- [x]`), the workflow will succeed.
