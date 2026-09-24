# rayfin-playground

## Prerequisites

`rayfin login` opens a browser via `xdg-open` for MSAL sign-in. If it hangs
with no browser popping up, install `xdg-utils` first:

```bash
sudo apt-get update && sudo apt-get install -y xdg-utils
```

## Tutorial followed

[Create rayfin with CLI](https://learn.microsoft.com/en-us/fabric/apps/create-app-with-cli)

```bash
cd /workspaces/rayfin-playground

RAYFIN_ENCRYPTION_FALLBACK_ENABLED=true npx --yes @microsoft/rayfin-cli login
npm create @microsoft/rayfin@latest -- "hello-world" --workspace-id "b6d561c2-5df2-4161-90ef-2b1532ab6642"

cd hello-world
npx rayfin dev
```

So that brings it up locally.

Then:

```bash
npx rayfin up
```

That uses your JWT and this thing to deploy to Fabric:

```
/workspaces/rayfin-playground/hello-world/rayfin/.deployments.json
```

## Where things are stored / credential injection

See [`tools/.rayfin/README.md`](tools/.rayfin/README.md) for where the
workspace config and MSAL credentials are stored on disk, and an
experimental `az`-login-based token injection approach.

## Real Semantic Model

[Tutorial](https://learn.microsoft.com/en-us/fabric/apps/data-apps-template)

> `TODO`

## Dev and Prod workflows

[Manual crappy tutorial](https://learn.microsoft.com/en-us/fabric/apps/dev-prod-workflow)
[GitHub Action tutorial](https://learn.microsoft.com/en-us/fabric/apps/deploy-github-actions)

> `TODO`

## Fabricator

[Tool thing](https://github.com/spatney/rayfin-fabricator)