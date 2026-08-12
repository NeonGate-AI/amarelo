# `@repo/react-mobile`

Shared React Native UI implementation for the mobile app.

React Native Reusables-generated source lives under
`src/vendors/react-native-reusables`. App code imports the stable public
subpaths exposed by this package:

```tsx
import { Button, Icon, Text } from '@repo/react-mobile/ui'
```

The consuming NativeWind configuration must scan `packages/react-mobile/src`.
Expo's monorepo-aware Metro defaults are retained; package-specific Metro
watch-folder overrides are unnecessary for the current Expo SDK.

Product-specific screens, feature state, and the current native voice orb stay
in the app until they have a second proven consumer.
