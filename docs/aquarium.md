# Light appearance

The portfolio uses its light palette only. The page declares `data-theme="light"` before first paint, and does not read old theme preferences from storage or the operating system. The theme switch, dark palette, aquarium renderer and aquarium pause control have been removed.

`src/components/SceneCells.tsx` activates the cells when the intro finishes and keeps their labels synchronized with the page language. `experience/theme.css` retains the light color variables and the text/image drag protections shared by pointer interactions.

The originally supplied components under `docs/component-sources/react-originals/` remain unbundled references.

`tests/theme.py` checks light appearance with dark OS and stored preferences, absent theme/aquarium controls, cell activation, language labels and layout at 1440 and 375 px.
