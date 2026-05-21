# AGENTS.md

This folder contains only Tampermonkey userscripts.

## Script conventions

- Author: Alec Larson.
- New scripts should start with `@version 1.0` in the userscript metadata block.
- Increment the script `@version` with every change.
  - Use a minor version bump for normal feature additions, behavior changes, fixes, refactors, or metadata updates.
  - Use a major version bump for breaking or significant behavior changes.
- Maintain a changelog in each script at the very end of the file as a JavaScript comment block.
  - Update the changelog whenever the script changes.
  - Include the new version number and a concise summary of the change.
- Keep each file as a self-contained Tampermonkey script unless there is a clear reason to do otherwise.
- Keep `README.md` in sync with the script collection:
  - Add a concise entry whenever a new script is added.
  - Update the relevant entry whenever an existing script receives a significant improvement or behavior change.
