GNU Affero General Public License v3.0

Copyright (c) 2025-2026 Ancient Nerds Contributors

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

Original content and documentation are licensed under CC BY 4.0.
See: https://creativecommons.org/licenses/by/4.0/
Site descriptions taken from Wikipedia stay under CC BY-SA 4.0, and third-party
data keeps the licence of its source (see ATTRIBUTION.md).

---

THIRD-PARTY LICENSES AND DATA ATTRIBUTION

This software incorporates data and code from various sources with different
licenses. See ATTRIBUTION.md for complete details.

IMPORTANT NOTES:

1. Data Sources: The archaeological site data displayed by this software comes
   from 30+ external sources, each with their own licenses. Using this software
   to display data does not grant you rights to the underlying data beyond what
   each source's license permits.

2. Mapbox: The frontend uses Mapbox GL JS which has a proprietary license.
   Commercial use may require a Mapbox account and appropriate subscription.
   See: https://www.mapbox.com/legal/tos

3. python-Levenshtein: This dependency is licensed under GPL-2.0+. If you
   distribute modified versions of this software that include python-Levenshtein,
   you may need to comply with GPL-2.0 requirements for that component.
   Alternatively, you can replace it with rapidfuzz (MIT licensed).

## Archa modifications

Source: https://github.com/ancientnerds/AncientMap/tree/7e4bee2d9fbffa11ca31706f0fb2b94bc4635dbe

The globe's original constants, sphere coordinate formula, front/back line shaders, vector segment construction and starfield shader were adapted to JavaScript from the upstream files sceneInit.ts, globeConstants.ts, segmentBuilder.ts and lineMaterials.ts. The Archa application is distributed under AGPL-3.0-or-later. Geographic start-layer files are retrieved from the pinned upstream commit, and remain subject to their source data licences (see https://github.com/ancientnerds/AncientMap/blob/7e4bee2d9fbffa11ca31706f0fb2b94bc4635dbe/ATTRIBUTION.md). Archa does not import any archaeological records or claim affiliation with Ancient Nerds. The browser implementation does not include the upstream Mapbox transition, labels, historical layers, or custom arcball; those are not represented as working options.
