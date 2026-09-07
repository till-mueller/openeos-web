#!/bin/sh
# Rewrites the sentinel tokens baked into the built .next output (see the
# Dockerfile's NEXT_PUBLIC_* ARG defaults) to their real runtime values, so
# one image can be redeployed against a different API/shop domain without a
# rebuild. If the image was built with real values passed as build-args
# instead of the sentinels, these greps simply find nothing and no-op.
set -e

replace_token() {
  token="$1"
  value="$2"
  grep -rl -- "$token" /app/.next /app/public 2>/dev/null | while IFS= read -r file; do
    sed -i "s|$token|$value|g" "$file"
  done
}

# Falling back to OpenEOS's own hosted domains keeps a `docker run` with no
# env vars set working out of the box — but for a self-hosted or airgapped
# deploy, an accidentally-unset var here means the container silently talks
# to someone else's production servers instead of failing in an obvious way.
# Not changed to a hard failure (would break any existing deployment that
# relies on the implicit default), but at least logged so it shows up in
# `docker logs` instead of being invisible.
if [ -z "$NEXT_PUBLIC_API_URL" ]; then
  echo "WARNING: NEXT_PUBLIC_API_URL is not set — defaulting to https://api.openeos.de. If this is a self-hosted or airgapped deployment, set it explicitly." >&2
fi
if [ -z "$NEXT_PUBLIC_SHOP_URL" ]; then
  echo "WARNING: NEXT_PUBLIC_SHOP_URL is not set — defaulting to https://shop.openeos.de. If this is a self-hosted or airgapped deployment, set it explicitly." >&2
fi

replace_token '__RUNTIME_NEXT_PUBLIC_API_URL__' "${NEXT_PUBLIC_API_URL:-https://api.openeos.de}"
replace_token '__RUNTIME_NEXT_PUBLIC_SHOP_URL__' "${NEXT_PUBLIC_SHOP_URL:-https://shop.openeos.de}"

exec "$@"
