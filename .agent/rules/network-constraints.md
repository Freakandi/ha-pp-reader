---
trigger: always_on
---

# Network & URL Constraints

## Browser & UI Verification
- **STRICT PROHIBITION**: You are **FORBIDDEN** from visually accessing the UI via `localhost`, `127.0.0.1`, or `0.0.0.0`.
- **MANDATORY URL**: You **MUST ALWAYS** use the specific IP: `http://192.168.5.108:8123/ppreader` for any browser interaction, verification, or screenshot task.
- **REASONING**: The dev container or network bridge does not reliably route loopback traffic to the correct service.