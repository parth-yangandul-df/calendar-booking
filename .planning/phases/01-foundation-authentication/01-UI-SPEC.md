# UI-SPEC: Phase 01 — Foundation & Authentication

## Design System

- **Library**: shadcn/ui (New York style, Zinc base color, CSS variables for theme)
- **Icons**: lucide-react
- **Form**: React Hook Form + Zod validation
- **Toast**: shadcn Sonner
- **Third-party registries**: None

## Pages

### Login Page (`/login`)

| Element | Spec |
|---------|------|
| Heading | "Welcome back" |
| Fields | Email (email input), Password (password input with show/hide toggle) |
| CTA | "Sign In" (primary button, full width) |
| Link | "Don't have an account? Sign up" → `/register` |
| Validation | Required fields, valid email format, min password length |
| Loading | Button shows spinner, fields disabled during submission |
| Errors | Toast: "Invalid email or password. Please try again." (401) / "Something went wrong. Please try again later." (server) |

### Register Page (`/register`)

| Element | Spec |
|---------|------|
| Heading | "Create your account" |
| Fields | Email, Password, Confirm Password |
| CTA | "Create Account" (primary button, full width) |
| Link | "Already have an account? Sign in" → `/login` |
| Validation | Required, valid email, password min 8 chars + letter + digit, confirm matches |
| Loading | Button shows spinner, fields disabled during submission |
| Errors | Inline field errors + toast for server errors |

### App Shell (post-login)

- Header with app name/logo and logout button
- Content area centered below header
- Standard shadcn card layout centered on page for auth forms
- Max width 400px for auth forms (centered)

## States

| State | Behavior |
|-------|----------|
| Session loading | Full-page centered spinner with "Checking authentication..." |
| Unauthenticated | Redirect to `/login` |
| Authenticated | Redirect to `/` (app) |
| Logout | Clear session, redirect to `/login` |
| Error | Toast notification, stay on current page |

## Responsive

- Auth forms: full width on mobile (padding 4), centered card on desktop (max-w-md)
- App shell: responsive header (hamburger or simple on mobile)

## Copywriting

- Login CTA: "Sign In"
- Register CTA: "Create Account"  
- Login heading: "Welcome back"
- Register heading: "Create your account"
- Auth error: "Invalid email or password. Please try again."
- Server error: "Something went wrong. Please try again later."
- Session loading: "Checking authentication..."
- Login link: "Don't have an account? Sign up"
- Register link: "Already have an account? Sign in"
