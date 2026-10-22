#!/usr/bin/env bash
set -euo pipefail

UPSTREAM='julian-alarcon/prospect-mail'
DEST="${1:-$HOME/development/prospect-mail}"
BRANCH='feat/outlook-wayland-ubuntu'
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
KIT_DIR="$(dirname "$SCRIPT_DIR")"

for cmd in gh git; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    printf 'Missing %s. Install it, then rerun this script.\n' "$cmd" >&2
    if [ "$cmd" = gh ]; then
      echo 'Ubuntu: sudo apt update && sudo apt install gh -y' >&2
    fi
    exit 1
  fi
done
if ! gh auth status >/dev/null 2>&1; then
  echo 'GitHub CLI not authenticated. Run: gh auth login' >&2
  exit 1
fi
USER_LOGIN="$(gh api user --jq '.login')"
FORK="$USER_LOGIN/prospect-mail"
printf 'Account: %s\nUpstream: %s\nFork: %s\nTarget: %s\n' "$USER_LOGIN" "$UPSTREAM" "$FORK" "$DEST"

# Creating a fork is an authorised requested action, but no other repositories
# or system defaults are changed. Reruns detect the existing fork.
if gh repo view "$FORK" --json nameWithOwner >/dev/null 2>&1; then
  echo 'Fork already exists; reusing it.'
else
  echo 'Creating fork on GitHub (this does not publish any additional changes)...'
  gh repo fork "$UPSTREAM" --clone=false
fi

if [ -e "$DEST" ]; then
  if [ ! -d "$DEST/.git" ]; then
    echo "Target exists but is not a Git repository: $DEST" >&2
    exit 1
  fi
  ORIGIN="$(git -C "$DEST" remote get-url origin 2>/dev/null || true)"
  case "$ORIGIN" in
    *"$USER_LOGIN/prospect-mail"*) echo 'Reusing existing fork checkout.' ;;
    *) echo "Existing checkout origin is not your intended fork: $ORIGIN" >&2; exit 1 ;;
  esac
  if [ -n "$(git -C "$DEST" status --porcelain)" ]; then
    echo 'Existing checkout has uncommitted changes. Refusing to overwrite files.' >&2
    echo 'Commit/stash your changes or choose a fresh target directory.' >&2
    exit 1
  fi
else
  mkdir -p "$(dirname "$DEST")"
  gh repo clone "$FORK" "$DEST" --no-upstream
fi

if ! git -C "$DEST" remote get-url upstream >/dev/null 2>&1; then
  git -C "$DEST" remote add upstream "https://github.com/$UPSTREAM.git"
fi
git -C "$DEST" config remote.pushDefault origin

git -C "$DEST" fetch upstream main
if git -C "$DEST" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git -C "$DEST" switch "$BRANCH"
else
  git -C "$DEST" switch -c "$BRANCH"
fi

# Install the independent Cursor work pack without touching existing upstream
# source files. A rerun is non-destructive and never overwrites existing rules.
for item in CURSOR_START_HERE.md AGENTS.md QUICK_PROMPT.txt README_CURSOR_KIT.md; do
  if [ -f "$KIT_DIR/$item" ]; then
    if [ -e "$DEST/$item" ]; then
      echo "Keeping existing $item"
    else
      cp "$KIT_DIR/$item" "$DEST/$item"
    fi
  fi
done
for sub in .cursor/rules docs/outlook scripts; do
  mkdir -p "$DEST/$sub"
  if [ -d "$KIT_DIR/$sub" ]; then
    while IFS= read -r -d '' file; do
      rel="${file#"$KIT_DIR"/}"
      if [ -e "$DEST/$rel" ]; then
        echo "Keeping existing $rel"
      else
        cp "$file" "$DEST/$rel"
      fi
    done < <(find "$KIT_DIR/$sub" -maxdepth 1 -type f -print0)
  fi
done

printf '\n--- Ready for Cursor ---\n'
printf 'Fork URL: https://github.com/%s\n' "$FORK"
printf 'Checkout: %s\nBranch: %s\n' "$DEST" "$BRANCH"
printf 'Upstream base: '
git -C "$DEST" rev-parse 'upstream/main'
printf '\nNext:\n  cursor %q\n' "$DEST"
echo 'Then paste QUICK_PROMPT.txt into Cursor Agent mode.'
echo 'No app was installed, no package published, and no corporate login attempted.'
