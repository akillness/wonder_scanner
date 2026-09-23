# Graph Report - wonder_scanner  (2026-09-23)

## Corpus Check
- 45 files · ~114,365 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 486 nodes · 1126 edges · 15 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4fe2118f`
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
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]

## God Nodes (most connected - your core abstractions)
1. `save()` - 36 edges
2. `esc()` - 21 edges
3. `$()` - 21 edges
4. `state` - 20 edges
5. `ownedCount()` - 19 edges
6. `WONDERS` - 17 edges
7. `finish()` - 15 edges
8. `rank()` - 15 edges
9. `🔭 WONDER SCANNER` - 14 edges
10. `drawLoop()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `card()` --calls--> `esc()`  [EXTRACTED]
  src/ui/screens/duel.js → src/ui/shell.js
- `detail()` --calls--> `esc()`  [EXTRACTED]
  src/ui/screens/album.js → src/ui/shell.js
- `refinePanel()` --calls--> `esc()`  [EXTRACTED]
  src/ui/screens/album.js → src/ui/shell.js
- `afterEvent()` --calls--> `esc()`  [EXTRACTED]
  src/ui/screens/scan.js → src/ui/shell.js
- `detail()` --calls--> `$()`  [EXTRACTED]
  src/ui/screens/album.js → src/ui/shell.js

## Communities (15 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (42): ACHIEVEMENTS, bindRarity(), checkAchievements(), computeReward(), streakMultiplier(), ensureDailyQuests(), questEvent(), questSummary() (+34 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (55): chapterLabels(), CHAPTERS, ALL_LABELS, RARITY, WONDERS, STAGES, LUPE, say (+47 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (22): 🧭 AR 요소 (WebXR 없이, 2D 캔버스 + 자이로), code:block1 (src/), code:bash (npm install), code:mermaid (flowchart TB), code:block4 (src/), code:bash (npm install), 🔭 WONDER SCANNER, 💫 경제 순환 — 별가루는 어디서 오고 어디로 가나 (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (16): dependencies, canvas-confetti, firebase, @tensorflow-models/coco-ssd, @tensorflow/tfjs, description, devDependencies, vite (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (19): MEDIA, createRecorder(), pickType(), ac(), audioStream(), blip(), chest(), chime() (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (21): 0. 한 줄 요약, 1. 원안 → 게임으로 바꾼 것, 2. 타임라인 (실제 커밋 시각 기준), 3. 단계별 체크리스트 (최종), 4. 설계 결정 (ADR-lite), 5. QA 로그 (Chrome DevTools MCP, 390×844), 6. 배포 기록, 7. 남은 아이디어 (+13 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (38): addMoment(), all(), compressImage(), db(), deleteMoment(), enforceCap(), fmtBytes(), getMoment() (+30 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (50): auraParticles, coverTransform(), createTracker(), drawCaptureRing(), drawFrame(), drawGradeBurst(), drawTarget(), roundRect() (+42 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (47): accessibility, media_alternatives, motion, settings_entry, signals, contract_version, data_bindings, decisions (+39 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (39): activeEvent(), advise(), eventMod(), EVENTS, markEventSeen(), onDiscoverEvent(), onDuelWin(), seeded() (+31 more)

### Community 11 - "Community 11"
Cohesion: 0.04
Nodes (45): accessibility, redundant_signals, settings, baseline, capture, inferred_stages, measured_stages, observations (+37 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (14): 1. 비전과 문제, 2. 페르소나, 3.1 코어 루프, 3.2 AR 레이어 (WebXR 없음), 3.3 성장·경제, 3.4 추억 (기록) 시스템, 3.5 소셜·클라우드, 3.6 접근성·설정 (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (10): 1. Firebase 프로젝트 (약 10분), 2. Vercel 환경변수, 3. 데이터 모델, 4. 동작, code:block1 (rules_version = '2';), code:block2 (rules_version = '2';), code:bash (vercel env add VITE_FIREBASE_API_KEY production), Firestore 규칙 (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (5): cfg, cloud, get(), listeners, onAuth()

## Knowledge Gaps
- **200 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+195 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `save()` connect `Community 10` to `Community 0`, `Community 1`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `$()` connect `Community 1` to `Community 0`, `Community 10`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `esc()` connect `Community 1` to `Community 0`, `Community 10`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _200 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08705882352941176 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05995975855130785 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09486166007905138 - nodes in this community are weakly interconnected._