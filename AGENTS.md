# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.
# MCMS Mobile App - AGENTS.md

## 1. Project

This is the MCMS Mobile App for the SmartMush project.

The app is primarily designed for Customer users.

Tech stack:

- React Native
- Expo SDK 57
- TypeScript
- Expo Router
- Redux Toolkit
- RTK Query
- Axios
- React Hook Form
- Zod
- React Native Reanimated
- React Native Gesture Handler
- FlashList
- Expo SecureStore

---

## 2. Expo Version

This project uses Expo SDK 57.

Before writing or modifying Expo-specific code, use the exact Expo SDK 57 documentation:

https://docs.expo.dev/versions/v57.0.0/

Do not use APIs or packages intended for incompatible Expo versions.

Do not upgrade Expo or React Native without explicit approval.

---

## 3. Architecture

Use Feature-Based Clean Architecture.

Dependency direction:

Presentation
↓
Domain
↓
Data

Rules:

- Presentation must not contain complex business logic.
- UI components must not directly implement API logic.
- Domain must be independent from React Native, Expo, Redux, Axios and UI.
- Data layer handles API/external data sources.
- Business logic belongs in the Domain layer.
- Keep features isolated and scalable.

Recommended structure:

src/
├── app/
│   ├── store/
│   └── providers/
│
├── core/
│   ├── api/
│   ├── config/
│   ├── constants/
│   ├── errors/
│   ├── storage/
│   ├── theme/
│   └── utils/
│
├── features/
│   ├── auth/
│   ├── home/
│   ├── rental/
│   ├── tray/
│   ├── monitoring/
│   ├── order/
│   ├── notification/
│   └── profile/
│
└── shared/
    ├── components/
    ├── hooks/
    ├── types/
    └── utils/

Use the structure as a guideline. Do not create unnecessary files or folders.

---

## 4. State Management

Use Redux Toolkit.

Do not use legacy Redux patterns.

Use Redux Toolkit for global client/application state such as:

- Authentication/session
- Global UI state
- Application settings
- Other genuinely global client state

Use RTK Query for server state such as:

- API data
- Trays
- Rentals
- Orders
- Monitoring data
- Notifications
- Other backend resources

Do not duplicate RTK Query data inside Redux unless there is a clear reason.

Use local React state for temporary UI state such as:

- Modal visibility
- Temporary selections
- Animation state
- Simple local interactions

Avoid putting everything into Redux.

---

## 5. API

Use Axios for HTTP communication.

Create a centralized API configuration.

Rules:

- Do not duplicate Axios configuration.
- Do not hardcode production API URLs throughout the application.
- Use configuration/environment variables where appropriate.
- Centralize authentication headers and common API behavior.
- Handle API errors consistently.

RTK Query should be used for server-state management.

---

## 6. Storage & Security

Use Expo SecureStore for sensitive local data.

Examples:

- Access tokens
- Refresh tokens
- Sensitive session information

Never:

- Hardcode credentials.
- Commit secrets.
- Log passwords.
- Log authentication tokens.
- Store sensitive authentication tokens in plain local storage.

Backend authorization is the final source of truth.

---

## 7. UI / UX

The application should feel:

- Modern
- Clean
- Professional
- Smooth
- Consistent
- Mobile-first

Use a centralized design system.

Create reusable theme definitions for:

- Colors
- Typography
- Spacing
- Border radius
- Shadows

Do not randomly create different styles for every screen.

Prefer reusable components.

Common reusable components may include:

- Button
- Input
- Card
- Header
- Badge
- Bottom Sheet
- Loading
- Skeleton
- Empty State
- Error State

Avoid unnecessary abstraction.

---

## 8. UI Quality

Every screen should consider:

- Loading state
- Empty state
- Error state
- Success state
- Disabled state

Use clear visual hierarchy.

Avoid:

- Excessive decoration
- Excessive gradients
- Too many colors
- Inconsistent spacing
- Tiny touch targets
- Cluttered layouts

Do not rely only on color to communicate important states.

---

## 9. Animation & Interaction

Use React Native Reanimated for animations.

Use React Native Gesture Handler for gestures.

Animations should:

- Improve feedback.
- Improve navigation.
- Feel smooth and natural.
- Avoid unnecessary JS-thread work.

Do not animate everything.

Do not add animations only for decoration.

---

## 10. Performance

Performance is a priority.

Avoid:

- Unnecessary re-renders
- Excessive global state
- Unnecessary API requests
- Expensive calculations during render
- Large unnecessary images
- Heavy UI libraries when unnecessary

Use:

- RTK Query caching
- Reanimated
- Gesture Handler
- FlashList when appropriate
- Efficient Redux selectors
- Memoization when justified

Do not use FlashList for every list automatically.

Optimize based on actual requirements.

---

## 11. TypeScript

Use TypeScript strictly.

Avoid:

- `any`
- Unsafe type assertions
- Duplicated types
- Disabling TypeScript checks

Prefer:

- Explicit types
- Reusable types
- Typed Redux hooks
- Typed API responses
- Strong domain models

Maintain type safety across:

UI
↓
Domain
↓
Data
↓
API

---

## 12. Forms

Use React Hook Form for complex forms.

Use Zod for validation.

Use `@hookform/resolvers` when connecting Zod with React Hook Form.

Forms should handle:

- Validation
- Errors
- Loading
- Disabled states
- Success feedback

---

## 13. Navigation

Use Expo Router.

Keep routing inside the `app/` directory.

Route files should primarily handle navigation and screen composition.

Do not put complex business logic inside route files.

---

## 14. Code Quality

Before modifying code:

1. Inspect the existing project.
2. Read this AGENTS.md.
3. Follow the existing architecture.
4. Avoid unnecessary rewrites.
5. Avoid unnecessary dependencies.

Before completing a task:

1. Run TypeScript checks.
2. Run ESLint.
3. Fix errors.
4. Remove unused imports/variables.
5. Verify the app still runs.

---

## 15. Dependency Rules

Before installing a new package:

1. Check whether the current stack already solves the problem.
2. Prefer Expo SDK 57 compatible packages.
3. Avoid duplicate libraries.
4. Do not upgrade major dependencies without approval.
5. Keep dependencies minimal.

---

## 16. Development Principle

Build incrementally.

Do not implement the entire application in one step.

For each feature:

1. Understand the requirement.
2. Inspect existing architecture.
3. Design the feature.
4. Implement domain logic.
5. Implement data/API layer.
6. Implement state management where necessary.
7. Implement UI.
8. Handle loading/error/empty states.
9. Test.
10. Run TypeScript and ESLint.

Prioritize:

- Clean Architecture
- Maintainability
- Type safety
- Performance
- UX quality
- Scalability

Do not sacrifice architecture for a quick implementation.