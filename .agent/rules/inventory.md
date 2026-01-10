---
trigger: always_on
---

# Rule: Public API Inventory

## Core Principle
**"Reuse Before You Build."**
To prevent complexity drift and redundant helpers, you must maintain and check a rigorous inventory of available functionality.

## Behaviors
1.  **Inventory Section**: Every Specification file (`docs/specs/*.md`) MUST have a `## Public API Inventory` section.
2.  **Mandatory Check**: Before implementing a new module, class, function, or helper, you MUST read the implementation spec's inventory.
3.  **Strict Entry**: If it's not in the Inventory, it does not exist. You cannot use "hidden" or "private" helpers across module boundaries.
