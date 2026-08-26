# Graph Report - saathi  (2026-08-23)

## Corpus Check
- 100 files · ~192,733 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 447 nodes · 765 edges · 27 communities (21 shown, 6 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22

## God Nodes (most connected - your core abstractions)
1. `useUser()` - 74 edges
2. `useLocationContext()` - 13 edges
3. `SectionHeader()` - 11 edges
4. `LocationProvider()` - 8 edges
5. `BuyerDiscovery()` - 7 edges
6. `getDistricts()` - 7 edges
7. `getVillages()` - 7 edges
8. `processVoiceQuery()` - 7 edges
9. `getContract()` - 6 edges
10. `sha256Hex()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `ProtectedPage()` --calls--> `useUser()`  [EXTRACTED]
  src/App.jsx → src/context/UserContext.jsx
- `CatchAllRedirect()` --calls--> `useUser()`  [EXTRACTED]
  src/App.jsx → src/context/UserContext.jsx
- `Hero()` --calls--> `useUser()`  [EXTRACTED]
  src/components/Hero.jsx → src/context/UserContext.jsx
- `GovernmentSchemesSection()` --calls--> `useUser()`  [EXTRACTED]
  src/components/portal/GovernmentSchemesSection.jsx → src/context/UserContext.jsx
- `AIVoiceModal()` --calls--> `useUser()`  [EXTRACTED]
  src/components/AIVoiceModal.jsx → src/context/UserContext.jsx

## Import Cycles
- None detected.

## Communities (27 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (37): AccessibilityPanel(), ColorThemePicker(), THEME_PALETTES, FloatingTools(), HeroNavigation(), HeroSearch(), SEARCH_CATEGORIES, TRENDING_SEARCHES (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (42): adminRoutes, app, authRoutes, blockchainRoutes, connectDB, cors, express, { sendOtp, verifyOtp } (+34 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (26): App(), CatchAllRedirect(), ProtectedPage(), HeroBackground(), PersistentFooter(), Admin(), API_BASE_URL, apiUrl() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (32): author, dependencies, axios, bcryptjs, cors, dotenv, ethers, express (+24 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (22): Hero(), LocationBar(), ManualLocationForm(), FarmerServices(), clearCachedLocation(), defaultState, loadCachedLocation(), LocationContext (+14 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (22): AIVoiceModal(), languageTagMap, naturalFemaleVoiceKeywords, prepareNaturalSpeechText(), BuyerDiscovery(), getBuyerTypes(), popularCrops, radiusOptions (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (16): marketService, AskSaathiPanel(), QUICK_QUESTIONS, AuthBoundaryCTA(), BuyerSnapshot(), FarmerReviewsIntro(), GovernmentSchemesSection(), formatRupees() (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (23): blockchainService, compareSupplyChain(), getBlockchainStats(), readBuyerVerification(), readSupplyChain(), recordSupplyChain(), { sha256Hex, toBytes32Hash }, supplyChainPayload() (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (25): @heroicons/react, dependencies, axios, bcryptjs, cors, dotenv, ethers, express (+17 more)

### Community 9 - "Community 9"
Cohesion: 0.16
Nodes (15): apiBaseUrl, getBlockchainStats(), getBuyerVerification(), getJson(), getSupplyChainVerification(), BlockchainTransparency(), BuyerVerification(), shortenHash() (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (19): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, vite, @vitejs/plugin-react, tailwindcss (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (16): devDependencies, dotenv, hardhat, @nomicfoundation/hardhat-toolbox, @openzeppelin/contracts, dotenv, name, private (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (10): abi, { ethers }, getBuyerVerification(), getConfig(), getContract(), getSupplyChainRecord(), pendingResult(), recordSupplyChainEvent() (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.25
Nodes (8): apiDir, fs, path, removeComments(), rootDir, SKIP_DIRS, TARGET_EXTENSIONS, walk()

### Community 14 - "Community 14"
Cohesion: 0.25
Nodes (8): apiDir, fs, path, removeComments(), rootDir, SKIP_DIRS, TARGET_EXTENSIONS, walk()

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (3): crypto, { expect }, hre

### Community 18 - "Community 18"
Cohesion: 0.50
Nodes (3): framework, headers, rewrites

## Knowledge Gaps
- **157 isolated node(s):** `express`, `cors`, `connectDB`, `authRoutes`, `blockchainRoutes` (+152 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useUser()` connect `Community 0` to `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 9`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 8` to `Community 10`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `SectionHeader()` connect `Community 6` to `Community 4`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `express`, `cors`, `connectDB` to the rest of the system?**
  _157 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07205513784461152 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05411764705882353 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07507507507507508 - nodes in this community are weakly interconnected._