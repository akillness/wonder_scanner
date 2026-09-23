# Graph Report - wonder_scanner  (2026-09-23)

## Corpus Check
- 14 files · ~31,545 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 125 nodes · 220 edges · 9 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7a1061c6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]

## God Nodes (most connected - your core abstractions)
1. `📜 HISTORY — Wonder Scanner 4시간 스프린트 기록` - 10 edges
2. `🔭 WONDER SCANNER` - 10 edges
3. `discover()` - 9 edges
4. `showTitle()` - 8 edges
5. `showScan()` - 7 edges
6. `tone()` - 7 edges
7. `hudHtml()` - 6 edges
8. `ownedCount()` - 6 edges
9. `totalCount()` - 6 edges
10. `rank()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `showTitle()` --calls--> `rank()`  [EXTRACTED]
  src/main.js → src/game/state.js
- `showTitle()` --calls--> `ownedCount()`  [EXTRACTED]
  src/main.js → src/game/state.js
- `showTitle()` --calls--> `totalCount()`  [EXTRACTED]
  src/main.js → src/game/state.js
- `warmModel()` --calls--> `loadDetector()`  [EXTRACTED]
  src/main.js → src/scanner/detector.js
- `hudHtml()` --calls--> `rank()`  [EXTRACTED]
  src/main.js → src/game/state.js

## Communities (9 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.16
Nodes (19): LUPE, say, canRescan(), owned(), flipCamera(), hasCamera(), snapshot(), startCamera() (+11 more)

### Community 1 - "Community 1"
Cohesion: 0.22
Nodes (16): chapterLabels(), CHAPTERS, WONDERS, computeReward(), rankFor(), chapterProgress(), discover(), fresh() (+8 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (17): code:mermaid (flowchart LR), code:mermaid (pie showData), code:mermaid (flowchart TB), code:block4 (src/), code:bash (npm install), 🔭 WONDER SCANNER, 🧠 구조 — 전부 브라우저 안에서, 📚 문서 (+9 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (15): dependencies, canvas-confetti, @tensorflow-models/coco-ssd, @tensorflow/tfjs, description, devDependencies, vite, name (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.20
Nodes (12): state, ac(), blip(), chime(), denied(), glitch(), retrigger(), shake() (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (15): 0. 한 줄 요약, 1. 원안 → 게임으로 바꾼 것, 2. 타임라인 (실제 커밋 시각 기준), 3. 단계별 체크리스트 (최종), 4. 설계 결정 (ADR-lite), 5. QA 로그 (Chrome DevTools MCP, 390×844), 6. 배포 기록, 7. 남은 아이디어 (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (7): ALL_LABELS, RARITY, loadImg(), renderCard(), roundRect(), shareCard(), wrap()

### Community 7 - "Community 7"
Cohesion: 0.40
Nodes (4): BALANCE, resonanceFillRate(), rollVariant(), detectTarget()

## Knowledge Gaps
- **36 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `renderCard()` connect `Community 6` to `Community 0`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._