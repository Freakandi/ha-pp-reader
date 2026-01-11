# Security Policy

## Supported Versions

Only the latest development version (main branch) is currently supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of this project seriously. If you find a security vulnerability, please **DO NOT** open a public issue.

### Process

1.  **Private Report**: Please report vulnerabilities by emailing the maintainer or using the GitHub "Report a vulnerability" tab if enabled.
2.  **Triage**: We will acknowledge your report within 48 hours and provide an estimated timeline for triage.
3.  **Fix**: valid critical vulnerabilities will be prioritized.
4.  **Disclosure**: We will coordinate the public disclosure after the fix has been released.

## Security Best Practices

This project follows strict security guidelines:
- No hardcoded secrets.
- Input validation for all external data.
- Dependency pinning to prevent supply chain attacks.
- Automated security scanning (ruff/bandit).

## XML Parsing

This project uses `lxml` for XML processing. To prevent XXE (XML External Entity) attacks, all XML parsing must use the secure helper functions provided in `custom_components/pp_reader/lib/xml_utils.py` which disable external entity resolution.
