# A&I Codex Working Instruction

This project has limited token budget.
Do not inspect or re-read the entire codebase unless the user explicitly asks for a full review.

Default working rule:
One prompt = one feature, one bug fix, or one clearly scoped task.

Before making changes:
1. Identify the smallest set of files likely related to the requested task.
2. Inspect only those files first.
3. If more context is needed, inspect only the next most relevant files.
4. If the task seems to require broad architectural changes, stop and ask for confirmation before scanning large parts of the project.

Do not:
- scan the whole repository by default
- run broad searches unless necessary
- refactor unrelated code
- rewrite working components
- clean up unrelated files
- change naming conventions without reason
- modify database schema unless the task requires it
- make “while I’m here” improvements

For UI tasks:
- inspect only the relevant page/component/style files
- avoid touching unrelated routes or shared components unless necessary

For Supabase/database tasks:
- inspect only the relevant Supabase client, service/query files, target feature files, and related schema/migration files

For bug fixes:
- inspect the error message, affected component, and directly related imports first
- do not perform a full project audit unless requested

After completing a task:
- summarize only the files changed
- explain why each file was changed
- mention any assumptions or skipped broader checks
