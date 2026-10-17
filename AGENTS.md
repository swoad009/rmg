<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Roles live in `public.user_roles` (enum `app_role`) checked via `has_role()`; never derive permissions from profile data. Why: prevents privilege escalation.
- Module visibility per role is defined once in `src/lib/roles.ts` (NAV_ITEMS). Why: single source for role-based navigation.
- First signed-up user gets `owner`, later users default to `merchandiser` (DB trigger). Why: bootstraps an admin without manual setup.
- Every business table has `org_id` (default `current_org_id()`); RLS reads/writes require `is_org_member(org_id)`. Why: organization-based multi-tenancy.
