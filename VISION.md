# Chart Topper - Vision Document

> A comprehensive poker training app that helps players master both preflop ranges and postflop decision-making through interactive practice.

---

## 🎯 Core Purpose

Help poker players **internalize correct decisions** so they can play faster, more confidently, and more profitably. The app turns poker study from tedious memorization into engaging, game-like practice.

**Two pillars:**
1. **Preflop** - Master opening ranges, 3-bet ranges, and preflop scenarios
2. **Postflop** - Develop sound decision-making on flop, turn, and river

---

## 🧠 Learning Philosophy

1. **Active recall over passive review** - Practice making decisions, not just reading charts
2. **Immediate feedback** - Know instantly if you're right or wrong
3. **Contextual learning** - Decisions organized by position, stack depth, and situation
4. **Build to understand** - Creating your own ranges/strategies deepens understanding
5. **Spaced repetition** - Focus on what you get wrong most often
6. **Mistake analysis** - Learning happens by understanding errors, not just seeing scores

### The Learning Loop

Effective learning requires a complete feedback loop:

```
Practice → Feedback → Identify Weakness → Targeted Practice → Track Progress → Repeat
```

| Step | Current Status |
|------|----------------|
| Practice | ✅ Quiz mode works |
| Feedback | ⚠️ Partial (score only, no details) |
| Identify Weakness | ❌ Missing |
| Targeted Practice | ❌ Missing (no drill mode) |
| Track Progress | ❌ Missing |

**Goal:** Complete the learning loop to make this a real training tool.

---

## 🃏 PREFLOP (Current Focus)

### What It Covers
- Opening ranges (RFI) by position
- Facing raises (call, 3-bet, fold)
- Facing 3-bets (call, 4-bet, fold)
- Short stack push/fold ranges
- Blind defense strategies

### Modes

#### Quiz Mode (✅ Implemented)
Test your range knowledge by painting a blank chart and comparing to the answer key.

#### Builder Mode (✅ Implemented)
Create and save your own ranges to build your personal range library.

#### Drill Mode (🔜 Priority)
Rapid-fire hand decisions - see a hand, pick an action, get feedback, next hand.
- Quick 1-2 minute practice sessions
- Filter by position/stack/scenario
- Focus on problem hands

#### Review Mode (🔜 Priority)
After quiz submission, detailed analysis of mistakes:
- Highlight incorrect cells
- Show your answer vs correct answer
- Pattern analysis (e.g., "You often fold suited connectors that should raise")

### Range Organization

Ranges categorized by three dimensions:

| Dimension | Options |
|-----------|---------|
| **Stack Size** | 80bb+, 40bb, 20bb, 10bb |
| **Position** | UTG, UTG+1, LJ, HJ, CO, BTN, SB, BB |
| **Scenario** | RFI, vs Raise, vs 3-Bet, vs 4-Bet, After Limp |

This creates **160+ unique ranges** to master.

---

## 📊 Current State Assessment

### What's Working Well ✅

| Feature | Why It Works |
|---------|--------------|
| Active recall via painting | Better than flashcards showing answers |
| Immediate score feedback | Know right away if you passed |
| Clean painting UX | Drag interaction feels natural |
| Flexible range selection | Easy to pick position/stack/scenario |
| Builder mode | Create and customize your own ranges |
| URL state sync | Shareable links, stays synced between modes |

### What's Missing for Real Learning ❌

| Gap | Impact | Description |
|-----|--------|-------------|
| **Mistake review** | 🔴 High | Can't see which specific hands were wrong or what the correct answer was |
| **Progress tracking** | 🔴 High | No memory between sessions, can't see improvement over time |
| **Drill mode** | 🟠 High | Full 169-cell chart takes too long for quick practice |
| **Spaced repetition** | 🟠 High | All ranges treated equally, should prioritize weak spots |
| **Range library gaps** | 🟡 Medium | Missing SB/BB, vs-raise, vs-3bet, short stack ranges |
| **Explanations** | 🟡 Medium | Users see *what* but not *why* |
| **Mobile touch** | 🟡 Medium | Painting could be smoother on touch devices |

---

## 🎰 POSTFLOP (Future)

### The Challenge

Postflop is fundamentally different from preflop:
- **Dynamic** - Decisions depend on board texture, opponent actions, pot size
- **Infinite scenarios** - Can't just memorize charts
- **Conceptual** - Need to understand *why*, not just *what*

### Possible Approaches

#### 1. Spot Training
Present specific postflop scenarios and test decision-making:
- "You have AK on K♠7♦2♣. Opponent checks. What do you do?"
- Multiple choice or slider for bet sizing
- Curated spots that teach important concepts

#### 2. Board Texture Recognition
Train pattern recognition for board textures:
- "Is this board wet or dry?"
- "Who does this board favor - raiser or caller?"
- "What draws are possible?"

#### 3. Range vs Range Visualization
Show how ranges interact with boards:
- Equity distribution on different textures
- Which hands want to bet/check/raise
- Understanding why certain plays are correct

#### 4. Bet Sizing Trainer
Practice choosing correct bet sizes:
- Given a spot, select the right sizing
- Learn when to go big vs small vs check

#### 5. Hand Reading Practice
Put opponents on ranges based on their actions:
- "Villain raises preflop, c-bets flop, checks turn. What's their range?"
- Narrow down ranges street by street

#### 6. GTO Spot Quizzes
Import solved spots from solvers and quiz on them:
- Show simplified strategy for common spots
- Focus on most frequent decisions

### Postflop Data Structure (Brainstorm)

```typescript
interface PostflopSpot {
  // Setup
  heroPosition: Position;
  villainPosition: Position;
  heroHand: [Card, Card];
  board: Card[];  // 3-5 cards
  potSize: number;
  stackSize: number;
  
  // History
  actions: Action[];  // Preflop and postflop actions so far
  
  // Question
  question: 'action' | 'sizing' | 'range' | 'concept';
  
  // Answer
  correctAction?: 'bet' | 'check' | 'call' | 'raise' | 'fold';
  correctSizing?: number;  // As percentage of pot
  explanation?: string;
}
```

### Open Questions

- How to balance GTO accuracy vs. simplicity for learning?
- How to source/generate quality postflop spots?
- How to handle the infinite variety of situations?
- Should we integrate with solver outputs?
- How to make postflop practice feel as smooth as preflop painting?

---

## 🎨 Design Principles

1. **Clean and focused** - No distractions, the decision is the star
2. **Fast interactions** - Everything should feel instant
3. **Mobile-friendly** - Study on the go
4. **Progressive complexity** - Start simple, unlock advanced concepts
5. **Consistent visual language** - Colors and patterns mean the same thing everywhere

### Color Conventions
| Color | Meaning |
|-------|---------|
| 🔴 Red | Raise / Bet / Aggressive |
| 🟢 Green | Call / Passive |
| 🔵 Blue | Fold / Give up |
| 🟡 Yellow | Check (postflop) |

---

## 🏗️ Technical Architecture

### Stack
- **Next.js 16** with App Router
- **React 19** with hooks
- **Tailwind CSS 4** with CSS-first config
- **TypeScript** for type safety

### Key Decisions
- **File-based data** - Simple `.ts` files, version-controlled
- **No database (yet)** - Keeps deployment simple
- **Component-first** - UI logic in components, routes are thin
- **Custom hooks** - Shared logic extracted
- **URL state** - Params in URL for shareability
- **localStorage** - Progress tracking without accounts (planned)

### Folder Structure
```
app/              → Routes only
components/       → UI components
hooks/            → Reusable logic
data/
  ├── ranges/     → Preflop range data
  └── spots/      → Postflop spot data (future)
styles/           → Global CSS
types/            → TypeScript definitions
tools/            → AI skills
```

---

## ✅ What's Built

### Preflop Features
- [x] 13×13 interactive range chart
- [x] Drag-to-paint interaction
- [x] Action palette (Raise/Call/Fold)
- [x] Quiz mode with scoring
- [x] Builder mode with save/load
- [x] Navigation with synced URL params
- [x] Responsive two-column layout

### Range Data (80bb RFI)
- [x] UTG
- [x] UTG+1
- [x] LJ
- [x] HJ
- [x] CO
- [x] BTN
- [ ] SB
- [ ] BB

### Infrastructure
- [x] API routes for save/load
- [x] Range parser AI skill
- [x] Shared hooks architecture
- [x] Vision document

---

## 🚀 Roadmap

### Quick Wins (Can Do Now) ⚡

These high-impact features could be built quickly:

| Feature | Effort | Impact |
|---------|--------|--------|
| Mistake highlighting after submit | Small | High |
| "Show correct answers" toggle | Small | High |
| Remember last range (localStorage) | Small | Medium |
| Session counter in header | Small | Low |

### Phase 1: Complete the Learning Loop 🔄

**Goal:** Make preflop quiz mode an effective learning tool

- [ ] **Mistake Review Screen**
  - Highlight wrong cells after submission
  - Show your answer vs correct answer side by side
  - List of "focus hands" that need work
  
- [ ] **Progress Persistence**
  - Save completed quizzes to localStorage
  - Track accuracy per range over time
  - "Continue where you left off"
  
- [ ] **Session Stats**
  - Quizzes completed today/all-time
  - Average accuracy trending
  - Practice streak tracking

### Phase 2: Drill Mode & Targeted Practice 🎯

**Goal:** Enable quick, focused practice sessions

- [ ] **Drill Mode**
  - Show one hand at a time
  - Pick action (R/C/F), get instant feedback
  - 30-second to 2-minute sessions
  - Filter by position/stack/scenario
  
- [ ] **Weak Spot Focus**
  - Automatically identify problem hands
  - "Practice your weak spots" mode
  - Spaced repetition algorithm

### Phase 3: Expand Range Library 📚

**Goal:** Cover all essential preflop scenarios

- [ ] Complete 80bb ranges (SB, BB opening)
- [ ] Add vs-raise ranges (calling, 3-betting)
- [ ] Add vs-3bet ranges (calling, 4-betting)
- [ ] 40bb ranges
- [ ] 20bb push/fold ranges
- [ ] 10bb push/fold ranges

### Phase 4: Polish & Platform 💎

- [ ] Dark mode
- [ ] Mobile touch optimization
- [ ] Range import/export (JSON)
- [ ] Explanations for hand decisions
- [ ] User accounts (optional)
- [ ] Cloud sync

### Phase 5: Postflop 🎰

- [ ] Design postflop data model
- [ ] Create first batch of training spots
- [ ] Build spot quiz UI
- [ ] Board texture trainer
- [ ] Bet sizing trainer

---

## 🎓 Meta Goals

This project is also a learning exercise for:
- Building with AI coding agents
- Creating AI "skills" for specialized tasks
- Modern React patterns
- Product thinking and iteration

---

## 📝 Reflection Prompts

1. **Is the learning loop complete?** Can users identify and fix their weaknesses?
2. **Is practice frictionless?** Can you squeeze in a quick session easily?
3. **Are we tracking what matters?** Do metrics help users improve?
4. **Is the code maintainable?** Can we easily add new features?
5. **What's the single biggest gap?** What would make the biggest difference if fixed?
6. **When is preflop "done enough"?** What's the bar before moving to postflop?
7. **What would make this a "must-have" app?**

---

*Last updated: January 2026*
