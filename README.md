# Checklist Gate GitHub Action

This action ensures that pull requests cannot be merged until required checklist items in the PR description are explicitly acknowledged with an accepted status value.

## How It Works

### Checklist items

The action reads the enforced checklist items from `config/checklist-items.txt`. When a pull request includes any of those labels in its description, the action verifies that each one is annotated with exactly one of the following status values inside the brackets:

- `✔` — completed, treated as a pass
- `✖` — not complete, treated as a pass - sometimes we legitimately may want to answer in the negative.
- `NA` or `na` — not applicable, treated as a pass


Checklist entries that are not present in the PR description also trigger a failure, ensuring authors explicitly acknowledge every required item. The action reports missing items separately from unchecked items and emits GitHub workflow error annotations for each issue so reviewers can see what needs attention at a glance. To customize which items are enforced, edit `config/checklist-items.txt` in this repository.

### Excluded users

In `config/excluded-users.txt`, the action also defines a list of Github usernames which are excluded from the checklist gate. When a pull request is created by one of the users, the checklist enforcement is skipped. This facilitates support for pull requests created by bots or other external tools, such as Dependabot or Weblate, where it's not expected the checklist items would be answered accordingly.

## Usage

See .github/workflows/matomo-ai-checklist.yml as an example usage (this repo checks its own PR bodies).

## Testing

Run the bundled self-tests with Node's test runner:

```bash
npm test
```

The tests temporarily replace `config/checklist-items.txt` with the single entry `Test line` and exercise several checklist permutations, covering each supported status value as well as invalid inputs. The original configuration is restored automatically at the end of the test run.
