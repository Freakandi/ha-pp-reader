# Cleaner's Journal

## 2025-02-23 - Removed config-level init
**Learning:** The `config/custom_components` directory serves as a namespace folder for Home Assistant to load custom integrations. Including an `__init__.py` file in this directory (even if just for logging helpers) converts it into a Python package, which can cause non-standard behavior and warnings.
**Action:** Removed `config/custom_components/__init__.py`. This restores the standard "Unverified Integration" warning from Home Assistant, which is the correct behavior for a development environment.
