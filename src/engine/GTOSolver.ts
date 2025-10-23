import {
  Card,
  GameState,
  Position,
  Action,
  GTOStrategy,
  StrategyAction,
  PlayerStats,
  ExploitativeAdjustment,
} from '../types';
import { PokerEngine } from './PokerEngine';

export class GTOSolver {
  // Pre-flop hand strength tiers
  private static readonly PREMIUM_HANDS = [
    'AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo'
  ];

  private static readonly STRONG_HANDS = [
    'TT', '99', 'AQs', 'AQo', 'AJs', 'AJo', 'KQs'
  ];

  private static readonly PLAYABLE_HANDS = [
    '88', '77', '66', '55', 'ATs', 'ATo', 'A9s', 'A8s',
    'KJs', 'KJo', 'KTs', 'QJs', 'QTs', 'JTs'
  ];

  private static readonly SUITED_CONNECTORS = [
    'T9s', '98s', '87s', '76s', '65s', '54s'
  ];

  // Calculate GTO strategy for current game state
  static calculateStrategy(state: GameState): GTOStrategy {
    const handStrength = this.evaluateHandStrength(state);
    const position = state.heroPosition;
    const street = state.street;
    const potOdds = state.currentBet > 0
      ? PokerEngine.calculatePotOdds(state.pot, state.currentBet)
      : 0;

    let actions: StrategyAction[] = [];

    if (street === 'preflop') {
      actions = this.getPreflopStrategy(state, handStrength, position);
    } else {
      actions = this.getPostflopStrategy(state, handStrength, potOdds);
    }

    const expectedValue = this.calculateExpectedValue(state, actions);

    return {
      actions,
      expectedValue
    };
  }

  // Get pre-flop GTO strategy
  private static getPreflopStrategy(
    state: GameState,
    handStrength: number,
    position: Position
  ): StrategyAction[] {
    const actions: StrategyAction[] = [];
    const handString = PokerEngine.getHandString(state.heroCards[0], state.heroCards[1]);
    const facingRaise = state.currentBet > 10; // Assumes BB is 10

    // Check if hand is in premium/strong/playable ranges
    const isPremium = this.PREMIUM_HANDS.includes(handString);
    const isStrong = this.STRONG_HANDS.includes(handString);
    const isPlayable = this.PLAYABLE_HANDS.includes(handString);
    const isSuitedConnector = this.SUITED_CONNECTORS.includes(handString);

    const isLatePosition = PokerEngine.isLatePosition(position);
    const isEarlyPosition = PokerEngine.isEarlyPosition(position);

    if (facingRaise) {
      // Facing a raise - tighter ranges
      if (isPremium) {
        actions.push(
          { action: 'raise', amount: state.currentBet * 3, frequency: 0.85, evLoss: 0 },
          { action: 'call', amount: state.currentBet, frequency: 0.15, evLoss: 0.05 }
        );
      } else if (isStrong) {
        actions.push(
          { action: 'call', amount: state.currentBet, frequency: 0.70, evLoss: 0 },
          { action: 'raise', amount: state.currentBet * 3, frequency: 0.20, evLoss: 0.02 },
          { action: 'fold', frequency: 0.10, evLoss: 0.15 }
        );
      } else if (isPlayable && isLatePosition) {
        actions.push(
          { action: 'call', amount: state.currentBet, frequency: 0.60, evLoss: 0 },
          { action: 'fold', frequency: 0.40, evLoss: 0.05 }
        );
      } else {
        actions.push(
          { action: 'fold', frequency: 1.0, evLoss: 0 }
        );
      }
    } else {
      // Opening action or facing limp
      if (isPremium) {
        actions.push(
          { action: 'raise', amount: 30, frequency: 1.0, evLoss: 0 }
        );
      } else if (isStrong) {
        if (isEarlyPosition) {
          actions.push(
            { action: 'raise', amount: 30, frequency: 0.80, evLoss: 0 },
            { action: 'fold', frequency: 0.20, evLoss: 0.08 }
          );
        } else {
          actions.push(
            { action: 'raise', amount: 30, frequency: 0.95, evLoss: 0 },
            { action: 'call', amount: 10, frequency: 0.05, evLoss: 0.03 }
          );
        }
      } else if (isPlayable) {
        if (isLatePosition) {
          actions.push(
            { action: 'raise', amount: 25, frequency: 0.70, evLoss: 0 },
            { action: 'fold', frequency: 0.30, evLoss: 0.05 }
          );
        } else {
          actions.push(
            { action: 'fold', frequency: 0.60, evLoss: 0 },
            { action: 'call', amount: 10, frequency: 0.40, evLoss: 0.10 }
          );
        }
      } else if (isSuitedConnector && isLatePosition) {
        actions.push(
          { action: 'raise', amount: 25, frequency: 0.50, evLoss: 0 },
          { action: 'fold', frequency: 0.50, evLoss: 0.03 }
        );
      } else {
        actions.push(
          { action: 'fold', frequency: 1.0, evLoss: 0 }
        );
      }
    }

    return this.normalizeFrequencies(actions);
  }

  // Get post-flop GTO strategy
  private static getPostflopStrategy(
    state: GameState,
    handStrength: number,
    potOdds: number
  ): StrategyAction[] {
    const actions: StrategyAction[] = [];
    const allCards = [...state.heroCards, ...state.board];
    const handEval = PokerEngine.evaluateHand(allCards);

    const hasStrongHand = ['straight-flush', 'four-of-a-kind', 'full-house', 'flush', 'straight'].includes(handEval.strength);
    const hasMadeHand = ['three-of-a-kind', 'two-pair', 'pair'].includes(handEval.strength);
    const hasDrawingHand = this.hasDrawingPotential(state);

    const facingBet = state.currentBet > 0;

    if (facingBet) {
      if (hasStrongHand) {
        // Strong hand - mix raises and calls
        actions.push(
          { action: 'raise', amount: state.pot * 0.75, frequency: 0.70, evLoss: 0 },
          { action: 'call', amount: state.currentBet, frequency: 0.30, evLoss: 0.02 }
        );
      } else if (hasMadeHand) {
        // Made hand - mostly call, some raises for value
        const equity = handStrength;
        if (equity > potOdds) {
          actions.push(
            { action: 'call', amount: state.currentBet, frequency: 0.75, evLoss: 0 },
            { action: 'raise', amount: state.pot * 0.60, frequency: 0.15, evLoss: 0.03 },
            { action: 'fold', frequency: 0.10, evLoss: 0.08 }
          );
        } else {
          actions.push(
            { action: 'fold', frequency: 0.65, evLoss: 0 },
            { action: 'call', amount: state.currentBet, frequency: 0.35, evLoss: 0.12 }
          );
        }
      } else if (hasDrawingHand) {
        // Drawing hand - check pot odds
        const drawEquity = this.estimateDrawEquity(state);
        if (drawEquity > potOdds) {
          actions.push(
            { action: 'call', amount: state.currentBet, frequency: 0.80, evLoss: 0 },
            { action: 'raise', amount: state.pot * 0.65, frequency: 0.10, evLoss: 0.05 },
            { action: 'fold', frequency: 0.10, evLoss: 0.08 }
          );
        } else {
          actions.push(
            { action: 'fold', frequency: 0.75, evLoss: 0 },
            { action: 'call', amount: state.currentBet, frequency: 0.25, evLoss: 0.15 }
          );
        }
      } else {
        // Weak hand - mostly fold
        actions.push(
          { action: 'fold', frequency: 0.85, evLoss: 0 },
          { action: 'call', amount: state.currentBet, frequency: 0.10, evLoss: 0.20 },
          { action: 'raise', amount: state.pot, frequency: 0.05, evLoss: 0.10 } // Bluff
        );
      }
    } else {
      // No bet facing
      if (hasStrongHand) {
        actions.push(
          { action: 'bet', amount: state.pot * 0.70, frequency: 0.80, evLoss: 0 },
          { action: 'check', frequency: 0.20, evLoss: 0.05 } // Slow play
        );
      } else if (hasMadeHand) {
        actions.push(
          { action: 'bet', amount: state.pot * 0.50, frequency: 0.60, evLoss: 0 },
          { action: 'check', frequency: 0.40, evLoss: 0.03 }
        );
      } else if (hasDrawingHand) {
        actions.push(
          { action: 'check', frequency: 0.70, evLoss: 0 },
          { action: 'bet', amount: state.pot * 0.40, frequency: 0.30, evLoss: 0.05 }
        );
      } else {
        actions.push(
          { action: 'check', frequency: 0.80, evLoss: 0 },
          { action: 'bet', amount: state.pot * 0.60, frequency: 0.20, evLoss: 0.08 } // Bluff
        );
      }
    }

    return this.normalizeFrequencies(actions);
  }

  // Evaluate hand strength (0-1 scale)
  private static evaluateHandStrength(state: GameState): number {
    if (state.street === 'preflop') {
      return this.evaluatePreflopStrength(state.heroCards);
    } else {
      const allCards = [...state.heroCards, ...state.board];
      const handEval = PokerEngine.evaluateHand(allCards);
      // Convert rank to 0-1 scale (lower rank is better)
      return 1 - (handEval.rank / 7462);
    }
  }

  // Evaluate pre-flop hand strength
  private static evaluatePreflopStrength(cards: Card[]): number {
    const handString = PokerEngine.getHandString(cards[0], cards[1]);

    if (this.PREMIUM_HANDS.includes(handString)) return 0.95;
    if (this.STRONG_HANDS.includes(handString)) return 0.80;
    if (this.PLAYABLE_HANDS.includes(handString)) return 0.60;
    if (this.SUITED_CONNECTORS.includes(handString)) return 0.45;

    // Check for pairs
    if (cards[0].rank === cards[1].rank) return 0.55;

    // Check for high cards
    const values = cards.map(c => PokerEngine['RANK_VALUES'][c.rank]);
    const avgValue = (values[0] + values[1]) / 2;

    return Math.max(0.2, avgValue / 14);
  }

  // Check if hand has drawing potential
  private static hasDrawingPotential(state: GameState): boolean {
    if (state.board.length < 3) return false;

    const allCards = [...state.heroCards, ...state.board];

    // Check for flush draw
    const suitCounts = new Map<string, number>();
    for (const card of allCards) {
      suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
    }
    const hasFlushDraw = Array.from(suitCounts.values()).some(count => count === 4);

    // Check for straight draw (simplified)
    const values = allCards.map(c => PokerEngine['RANK_VALUES'][c.rank]).sort((a, b) => b - a);
    let hasStraightDraw = false;
    for (let i = 0; i < values.length - 3; i++) {
      const span = values[i] - values[i + 3];
      if (span <= 4) {
        hasStraightDraw = true;
        break;
      }
    }

    return hasFlushDraw || hasStraightDraw;
  }

  // Estimate equity for drawing hands
  private static estimateDrawEquity(state: GameState): number {
    const hasFlushDraw = this.hasFlushDraw(state);
    const hasStraightDraw = this.hasStraightDraw(state);

    let outs = 0;
    if (hasFlushDraw) outs += 9;
    if (hasStraightDraw) outs += 8;

    // Rule of 2 and 4: multiply outs by 2 (turn) or 4 (flop)
    const multiplier = state.street === 'flop' ? 4 : 2;
    return Math.min(1, (outs * multiplier) / 100);
  }

  private static hasFlushDraw(state: GameState): boolean {
    const allCards = [...state.heroCards, ...state.board];
    const suitCounts = new Map<string, number>();
    for (const card of allCards) {
      suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
    }
    return Array.from(suitCounts.values()).some(count => count === 4);
  }

  private static hasStraightDraw(state: GameState): boolean {
    const allCards = [...state.heroCards, ...state.board];
    const values = allCards.map(c => PokerEngine['RANK_VALUES'][c.rank])
      .sort((a, b) => b - a);

    for (let i = 0; i < values.length - 3; i++) {
      const span = values[i] - values[i + 3];
      if (span <= 4) return true;
    }
    return false;
  }

  // Calculate expected value for action mix
  private static calculateExpectedValue(state: GameState, actions: StrategyAction[]): number {
    // Simplified EV calculation
    let ev = 0;
    for (const action of actions) {
      const actionEV = this.getActionEV(state, action);
      ev += actionEV * action.frequency;
    }
    return ev;
  }

  private static getActionEV(state: GameState, action: StrategyAction): number {
    const handStrength = this.evaluateHandStrength(state);

    switch (action.action) {
      case 'fold':
        return 0;
      case 'check':
        return handStrength * state.pot * 0.3;
      case 'call':
        return handStrength * (state.pot + (action.amount || 0)) - (action.amount || 0);
      case 'bet':
      case 'raise':
        return handStrength * (state.pot + (action.amount || 0)) * 1.3 - (action.amount || 0);
      default:
        return 0;
    }
  }

  // Normalize action frequencies to sum to 1.0
  private static normalizeFrequencies(actions: StrategyAction[]): StrategyAction[] {
    const total = actions.reduce((sum, a) => sum + a.frequency, 0);
    return actions.map(a => ({
      ...a,
      frequency: a.frequency / total
    }));
  }

  // Generate exploitative adjustments based on villain stats
  static getExploitativeAdjustments(
    state: GameState,
    villainStats: PlayerStats,
    gtoStrategy: GTOStrategy
  ): ExploitativeAdjustment[] {
    const adjustments: ExploitativeAdjustment[] = [];

    // Adjust for tight players (low VPIP)
    if (villainStats.vpip < 15) {
      adjustments.push({
        adjustment: 'Fold more to raises',
        reason: 'Villain is very tight and likely has a strong hand when raising',
        frequency: 0.15
      });
      adjustments.push({
        adjustment: 'Bluff less',
        reason: 'Tight players don\'t fold enough to make bluffs profitable',
        frequency: -0.20
      });
    }

    // Adjust for loose players (high VPIP)
    if (villainStats.vpip > 35) {
      adjustments.push({
        adjustment: 'Value bet more',
        reason: 'Loose players call too often with weak hands',
        frequency: 0.25
      });
      adjustments.push({
        adjustment: 'Tighten calling range vs raises',
        reason: 'Loose-aggressive player raises too wide',
        frequency: -0.10
      });
    }

    // Adjust for passive players (low aggression)
    if (villainStats.aggression < 1.5) {
      adjustments.push({
        adjustment: 'Bluff more',
        reason: 'Passive players fold too often to aggression',
        frequency: 0.30
      });
      adjustments.push({
        adjustment: 'Value bet thinner',
        reason: 'Passive players call with marginal hands',
        frequency: 0.15
      });
    }

    // Adjust for aggressive players (high aggression)
    if (villainStats.aggression > 3.0) {
      adjustments.push({
        adjustment: 'Call down lighter',
        reason: 'Aggressive players bluff too much',
        frequency: 0.20
      });
      adjustments.push({
        adjustment: 'Check-raise more',
        reason: 'Aggressive players bet too often',
        frequency: 0.25
      });
    }

    // Adjust for players who fold to c-bets too much
    if (villainStats.foldToCBet > 65) {
      adjustments.push({
        adjustment: 'C-bet more frequently',
        reason: 'Villain folds too often to continuation bets',
        frequency: 0.30
      });
    }

    // Adjust for players who don't fold to c-bets
    if (villainStats.foldToCBet < 35) {
      adjustments.push({
        adjustment: 'C-bet less as bluff',
        reason: 'Villain doesn\'t fold enough to c-bets',
        frequency: -0.25
      });
    }

    return adjustments;
  }

  // Get recommended action (highest frequency or lowest EV loss)
  static getRecommendedAction(strategy: GTOStrategy): StrategyAction {
    return strategy.actions.reduce((best, current) =>
      current.frequency > best.frequency ? current : best
    );
  }

  // Compare user action to optimal strategy
  static evaluateDecision(
    userAction: Action,
    userAmount: number | undefined,
    strategy: GTOStrategy
  ): { evLoss: number; feedback: string; correct: boolean } {
    const matchingAction = strategy.actions.find(a => a.action === userAction);

    if (!matchingAction) {
      return {
        evLoss: 0.50,
        feedback: 'This action is not recommended in this situation.',
        correct: false
      };
    }

    const bestAction = this.getRecommendedAction(strategy);
    const isOptimal = matchingAction === bestAction;
    const evLoss = matchingAction.evLoss || 0;

    let feedback = '';
    if (isOptimal) {
      feedback = `Excellent! This is the optimal play with a ${(matchingAction.frequency * 100).toFixed(1)}% frequency.`;
    } else if (matchingAction.frequency > 0.30) {
      feedback = `Good play. This action is viable ${(matchingAction.frequency * 100).toFixed(1)}% of the time.`;
    } else if (matchingAction.frequency > 0.10) {
      feedback = `Acceptable, but not optimal. This should only be played ${(matchingAction.frequency * 100).toFixed(1)}% of the time.`;
    } else {
      feedback = `This is a weak play. The EV loss is ${(evLoss * 100).toFixed(1)}% of the pot.`;
    }

    return {
      evLoss,
      feedback,
      correct: matchingAction.frequency > 0.25
    };
  }
}
