# auth

Placeholder — this is where Clerk sign-in/session logic will live once auth is
wired up on the frontend. Not implemented yet; the backend already expects
Clerk-authenticated requests (`Depends(get_current_user)`) on every agent route,
but nothing here calls them yet.
