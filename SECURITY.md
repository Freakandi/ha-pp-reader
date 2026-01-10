# Security Policy

## Supported Versions

Since this project is currently undergoing a complete rewrite ("Project Phoenix"), only the latest development version is supported.

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| 1.x     | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a vulnerability in the "Portfolio Performance Reader" integration or its frontend:

1.  **Do NOT open a public issue.**
2.  Please report the vulnerability by emailing the maintainer or opening a **Private** vulnerability report on GitHub if enabled.

### Information to Include
*   Description of the vulnerability.
*   Steps to reproduce.
*   Potential impact.

## Security Best Practices for Users
*   Ensure your Home Assistant instance is secured (HTTPS, strong passwords, 2FA).
*   Do not expose the Portfolio Performance XML file to the public internet.
*   Keep this integration updated to the latest version.

## Scope
This policy applies to:
*   The Python backend (`custom_components/pp_reader`).
*   The React frontend (`src/`).
