# Checklist Gate GitHub Action

This action ensures that pull requests cannot be merged until required checklist items in the PR description are explicitly acknowledged with an accepted status value.

## How It Works

The action reads the enforced checklist items from `config/checklist-items.txt`. When a pull request includes any of those labels in its description, the action verifies that each one is annotated with exactly one of the following status values inside the brackets:

- `✔` — completed, treated as a pass
- `✖` — not complete, treated as a failure
- `NA` or `na` — not applicable, treated as a pass

For example, `- [✔] Tests written or updated`. If a matching checklist item is marked with any other value, the action fails because the status is unsupported. The default configuration enforces the following items:

- Tests written or updated
- Documentation updated
- Product sign-off received

Checklist entries that are not present in the PR description also trigger a failure, ensuring authors explicitly acknowledge every required item. The action reports missing items separately from unchecked items and emits GitHub workflow error annotations for each issue so reviewers can see what needs attention at a glance. To customize which items are enforced, edit `config/checklist-items.txt` in this repository.

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
- [✖] Tests written or updated
- [✔] Documentation updated
- [NA] Product sign-off received
```

The action will fail because the first item is present but explicitly marked as ✖. Once the author updates the entry to an accepted passing value (`✔`, `NA`, or `na`), the workflow will succeed.

## Testing

Run the bundled self-tests with Node's test runner:

```bash
npm test
```

The tests temporarily replace `config/checklist-items.txt` with the single entry `Test line` and exercise several checklist permutations, covering each supported status value as well as invalid inputs. The original configuration is restored automatically at the end of the test run.
