---
trigger: always_on
---

## Project Hygiene
- **Language**: Output must be in English (plans, artifacts, comments), even if some existing docs are in German.
- **Logging**: Use namespace `custom_components.pp_reader.<module>`.
- **Completion Gate**: You are **PROHIBITED** from calling `notify_user` to finish a task until you have marked the corresponding item (or items, if you completed more than one) as completed `[x]` in the original source TODO file (e.g. [.docs/TODO_backdating5_testing.md](cci:7://file:///home/andreas/coding/repos/ha-pp-reader/.docs/TODO_backdating5_testing.md:0:0-0:0)).
- **Autonomy**: You may process multiple sub-tasks in one session, provided `task.md` accurately tracks your progress.