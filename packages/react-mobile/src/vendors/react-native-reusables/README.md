# React Native Reusables source subset

This package contains locally controlled adaptations of the React Native
Reusables `button`, `text`, and `icon` registry components for Amarelo mobile
applications.

- Upstream: <https://github.com/founded-labs/react-native-reusables>
- Registry source reviewed at commit:
  `119d0b101ff0d18408dc392120e12b5c78ae0c05`
- License: MIT; see `LICENSE` in this directory.

Local changes are limited to package-local import paths, the Amarelo token set,
and a smaller variant surface. Product code imports the public
`@repo/react-mobile/ui/*` subpaths rather than reaching into this directory.
