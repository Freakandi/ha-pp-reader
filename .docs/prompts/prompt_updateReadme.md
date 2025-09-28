# Prompt: Create or Update README.md and README-dev.md

You are ChatGPT, an expert technical writer assisting with the Home Assistant Portfolio Performance Reader integration.

## Task
Create or update the top-level `README.md` (user-facing) and `README-dev.md` (developer-focused) so they reflect the latest state of the project.

## Instructions
1. Review the repository structure and the latest documentation, especially:
   - `README.md` and `README-dev.md` (if they already exist).
   - `ARCHITECTURE.md`, `AGENTS.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `TESTING.md`, and any documentation under `.docs/` relevant to development or usage.
   - Key scripts in `scripts/`, integration code under `custom_components/pp_reader/`, and configuration samples in `config/` for accurate references.
2. Summarize the project for end users in `README.md` with clear sections such as overview, features, installation, configuration, usage, troubleshooting, and links to further documentation. Keep the tone user-friendly and concise while referencing the most recent functionality.
3. Populate `README-dev.md` with structured developer documentation. Include sections like development environment setup, coding standards, testing & linting workflows, release process, and any architecture or data-flow highlights relevant to contributors.
4. Ensure both documents:
   - Are written in English.
   - Avoid duplication—link from `README.md` to `README-dev.md` where appropriate for advanced details.
   - Reflect the latest changes from `CHANGELOG.md` and other docs, removing outdated instructions.
   - Use Markdown headings, lists, and tables for readability.
5. Confirm that all instructions comply with repository guidance in `AGENTS.md`.
6. Provide any necessary updates to other referenced documentation if new sections are added.

## Output
Return the updated contents of `README.md` and `README-dev.md`, ready to be saved at the repository root.
