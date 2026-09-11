# WanderWise Git Rules

## Branch Strategy

- `main` – Stable version of the project.
- `develop` – Main development branch.
- `feature/<feature-name>` – Used for developing new features.
- `bugfix/<issue-name>` – Used for fixing bugs.

Examples:
- feature/login
- feature/itinerary
- feature/route-optimization
- feature/budget-tracker

---

## Commit Message Format

Use the following prefixes:

- feat: New feature
- fix: Bug fix
- docs: Documentation updates
- style: Formatting changes
- refactor: Code improvements
- test: Testing-related changes
- chore: Maintenance tasks

Examples:

feat: Add login screen

fix: Resolve itinerary loading issue

docs: Update project README

---

## Team Workflow

1. Pull the latest changes before starting work.
2. Create a new feature branch from `develop`.
3. Make your changes.
4. Commit your work with a descriptive message.
5. Push your branch to GitHub.
6. Open a Pull Request to merge into `develop`.
7. After review and approval, merge the branch.
8. Do not push directly to the `main` branch.

---

## General Rules

- One feature per branch.
- Write clear commit messages.
- Test your code before creating a Pull Request.
- Delete feature branches after they are merged.
