---
description: Stage 1 - Create a high-level Feature Plan (Alignment).
---
# Workflow: Plan Feature (Alignment)

1.  **Context Setup**:
    *   Read the User Request.
    *   **Propose Name**: detailed_feature_name (e.g., `config_flow_v1`).
    *   Create Directory: `docs/backlog/active/[feature_name]/`.

2.  **Draft Plan**:
    *   Create File: `docs/backlog/active/[feature_name]/PLAN.md`.
    *   **Content Requirement**:
        *   **Goal**: One sentence summary.
        *   **Problem Statement**: Why do we need this?
        *   **Inventory Check**: Which existing specs/functions are affected?
        *   **Approach**: High-level strategy (No code yet).

3.  **Iterate**:
    *   Present the content of `PLAN.md` to the user.
    *   Ask for feedback.
    *   Refine `PLAN.md` until user says "Plan Approved".

4.  **Finalize**:
    *   User explicitly confirms alignment.
    *   **STOP**. Do not proceed to Spec. Instruct user to start new session for `/define-spec`.
