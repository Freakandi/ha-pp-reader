---
trigger: always_on
---

# Rule: Specification First

## Core Principle
**"The Specification is the Compiler."**
You are FORBIDDEN from writing any implementation code unless a corresponding Specification file in `docs/specs/` explicitly describes it.

## Behaviors
1.  **Missing Spec**: If asked to "add a feature" and no Spec exists, your ONLY valid action is to ASK THE USER to create the Spec first.
2.  **Missing Detail**: Developing a class/function not mentioned in the Spec is a "Linker Error". STOP and ASK THE USER to update the Spec.
3.  **One-Way Flow**: Data flows `Docs -> Code`. If code drifts, the CODE is wrong. ASK THE USER to Fix code or perform an explicit "Spec Amendment".
