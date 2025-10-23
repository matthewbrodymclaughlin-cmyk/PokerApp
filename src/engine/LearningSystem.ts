import {
  DecisionResult,
  LearningMetrics,
  TrainingScenario,
  GameState,
  Position,
  Street,
  PlayerStats,
  Card,
} from '../types';
import { PokerEngine } from './PokerEngine';
import { GTOSolver } from './GTOSolver';

export class LearningSystem {
  private results: DecisionResult[] = [];
  private weaknessPatterns: Map<string, number> = new Map();

  // Initialize learning metrics
  static initializeMetrics(): LearningMetrics {
    return {
      totalHands: 0,
      correctDecisions: 0,
      avgEvLoss: 0,
      strengthsByStreet: {
        preflop: 0,
        flop: 0,
        turn: 0,
        river: 0
      },
      weaknesses: [],
      improvementAreas: []
    };
  }

  // Update metrics with new decision result
  static updateMetrics(
    metrics: LearningMetrics,
    result: DecisionResult,
    street: Street
  ): LearningMetrics {
    const newMetrics = { ...metrics };

    newMetrics.totalHands++;
    if (result.correct) {
      newMetrics.correctDecisions++;
    }

    // Update average EV loss
    const totalEvLoss = metrics.avgEvLoss * metrics.totalHands + result.evLoss;
    newMetrics.avgEvLoss = totalEvLoss / newMetrics.totalHands;

    // Update street-specific strengths
    const currentStrength = metrics.strengthsByStreet[street];
    const newStrength = result.correct ? 1 : 0;
    const handCount = metrics.totalHands;

    newMetrics.strengthsByStreet[street] =
      (currentStrength * (handCount - 1) + newStrength) / handCount;

    return newMetrics;
  }

  // Identify player weaknesses from results
  static identifyWeaknesses(results: DecisionResult[], metrics: LearningMetrics): string[] {
    const weaknesses: string[] = [];

    // Check overall accuracy
    const accuracy = metrics.correctDecisions / metrics.totalHands;
    if (accuracy < 0.60) {
      weaknesses.push('Overall decision-making needs improvement');
    }

    // Check street-specific weaknesses
    if (metrics.strengthsByStreet.preflop < 0.65) {
      weaknesses.push('Pre-flop hand selection and position awareness');
    }
    if (metrics.strengthsByStreet.flop < 0.60) {
      weaknesses.push('Flop play and continuation betting');
    }
    if (metrics.strengthsByStreet.turn < 0.60) {
      weaknesses.push('Turn decision-making and pot control');
    }
    if (metrics.strengthsByStreet.river < 0.60) {
      weaknesses.push('River value betting and bluff catching');
    }

    // Check EV loss
    if (metrics.avgEvLoss > 0.15) {
      weaknesses.push('High EV loss - focus on optimal play frequencies');
    }

    // Analyze patterns in recent results
    const recentResults = results.slice(-20);
    const foldErrors = recentResults.filter(r =>
      r.userAction.action === 'fold' && !r.correct
    ).length;
    const aggressionErrors = recentResults.filter(r =>
      ['raise', 'bet'].includes(r.userAction.action) && !r.correct
    ).length;

    if (foldErrors > 5) {
      weaknesses.push('Over-folding - need to defend more');
    }
    if (aggressionErrors > 5) {
      weaknesses.push('Over-aggressive - need better hand selection for raises');
    }

    return weaknesses;
  }

  // Get improvement recommendations
  static getImprovementAreas(weaknesses: string[]): string[] {
    const improvements: string[] = [];

    if (weaknesses.some(w => w.includes('Pre-flop'))) {
      improvements.push('Study pre-flop ranges by position');
      improvements.push('Practice identifying premium vs playable hands');
    }

    if (weaknesses.some(w => w.includes('Flop'))) {
      improvements.push('Work on board texture reading');
      improvements.push('Practice continuation betting frequencies');
    }

    if (weaknesses.some(w => w.includes('Turn'))) {
      improvements.push('Focus on turn barreling strategy');
      improvements.push('Improve hand reading on turn cards');
    }

    if (weaknesses.some(w => w.includes('River'))) {
      improvements.push('Practice river value betting ranges');
      improvements.push('Work on bluff catching with bluff catchers');
    }

    if (weaknesses.some(w => w.includes('EV loss'))) {
      improvements.push('Review GTO frequencies for common spots');
      improvements.push('Reduce exploitable tendencies');
    }

    if (weaknesses.some(w => w.includes('Over-folding'))) {
      improvements.push('Study minimum defense frequencies');
      improvements.push('Practice calling with bluff catchers');
    }

    if (weaknesses.some(w => w.includes('Over-aggressive'))) {
      improvements.push('Tighten raising ranges');
      improvements.push('Balance value bets with bluffs');
    }

    return improvements;
  }

  // Generate personalized training scenario
  static generateScenario(
    metrics: LearningMetrics,
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  ): TrainingScenario {
    // Focus on weakest street
    const weakestStreet = this.getWeakestStreet(metrics);
    const positions = this.getPositionsForDifficulty(difficulty);

    // Generate scenario targeting weakness
    const heroPosition = positions.hero[Math.floor(Math.random() * positions.hero.length)];
    const villainPosition = positions.villain[Math.floor(Math.random() * positions.villain.length)];

    const gameState = this.generateGameState(heroPosition, villainPosition, weakestStreet, difficulty);
    const gtoStrategy = GTOSolver.calculateStrategy(gameState);

    // Add exploitative adjustments for advanced/expert
    let exploitativeAdjustments;
    if (difficulty === 'advanced' || difficulty === 'expert') {
      const villainStats = this.generateVillainStats(difficulty);
      exploitativeAdjustments = GTOSolver.getExploitativeAdjustments(
        gameState,
        villainStats,
        gtoStrategy
      );
    }

    return {
      id: this.generateScenarioId(),
      gameState,
      gtoStrategy,
      exploitativeAdjustments,
      difficulty
    };
  }

  // Get weakest street from metrics
  private static getWeakestStreet(metrics: LearningMetrics): Street {
    const streets: Street[] = ['preflop', 'flop', 'turn', 'river'];
    let weakest: Street = 'preflop';
    let lowestScore = 1.0;

    for (const street of streets) {
      if (metrics.strengthsByStreet[street] < lowestScore) {
        lowestScore = metrics.strengthsByStreet[street];
        weakest = street;
      }
    }

    return weakest;
  }

  // Get appropriate positions based on difficulty
  private static getPositionsForDifficulty(
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  ): { hero: Position[]; villain: Position[] } {
    switch (difficulty) {
      case 'beginner':
        // Easy positions - button vs blinds
        return {
          hero: ['BTN', 'CO'],
          villain: ['BB', 'SB']
        };
      case 'intermediate':
        // Medium positions - mix
        return {
          hero: ['CO', 'BTN', 'SB'],
          villain: ['BB', 'SB', 'BTN']
        };
      case 'advanced':
        // Harder positions - all positions
        return {
          hero: ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'],
          villain: ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']
        };
      case 'expert':
        // Expert - difficult positions
        return {
          hero: ['UTG', 'MP', 'SB', 'BB'],
          villain: ['CO', 'BTN', 'UTG', 'MP']
        };
    }
  }

  // Generate game state for training
  private static generateGameState(
    heroPosition: Position,
    villainPosition: Position,
    street: Street,
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  ): GameState {
    const deck = PokerEngine.createDeck();
    let { cards: heroCards, remainingDeck } = PokerEngine.dealCards(deck, 2);

    // For beginners, give them decent hands more often
    if (difficulty === 'beginner' && Math.random() > 0.4) {
      heroCards = this.generateDecentHand();
    }

    const state: GameState = {
      heroPosition,
      villainPosition,
      street: 'preflop',
      pot: 15,
      heroStack: 1000,
      villainStack: 1000,
      heroCards,
      board: [],
      actionHistory: [],
      currentBet: 10
    };

    // Advance to target street if needed
    if (street !== 'preflop') {
      let currentDeck = remainingDeck;
      state.street = street;

      // Deal flop
      if (street === 'flop' || street === 'turn' || street === 'river') {
        const flopDeal = PokerEngine.dealCards(currentDeck, 3);
        state.board = flopDeal.cards;
        currentDeck = flopDeal.remainingDeck;
        state.pot = 60;
        state.currentBet = 0;
      }

      // Deal turn
      if (street === 'turn' || street === 'river') {
        const turnDeal = PokerEngine.dealCards(currentDeck, 1);
        state.board = [...state.board, ...turnDeal.cards];
        currentDeck = turnDeal.remainingDeck;
        state.pot = 120;
        state.currentBet = Math.random() > 0.5 ? 60 : 0;
      }

      // Deal river
      if (street === 'river') {
        const riverDeal = PokerEngine.dealCards(currentDeck, 1);
        state.board = [...state.board, ...riverDeal.cards];
        state.pot = 240;
        state.currentBet = Math.random() > 0.5 ? 120 : 0;
      }
    }

    return state;
  }

  // Generate a decent hand for beginners
  private static generateDecentHand(): Card[] {
    const decentHands = [
      [{ rank: 'A' as const, suit: '♠' as const }, { rank: 'K' as const, suit: '♠' as const }],
      [{ rank: 'A' as const, suit: '♥' as const }, { rank: 'Q' as const, suit: '♥' as const }],
      [{ rank: 'K' as const, suit: '♦' as const }, { rank: 'K' as const, suit: '♣' as const }],
      [{ rank: 'Q' as const, suit: '♠' as const }, { rank: 'Q' as const, suit: '♥' as const }],
      [{ rank: 'J' as const, suit: '♠' as const }, { rank: 'J' as const, suit: '♦' as const }],
      [{ rank: 'A' as const, suit: '♣' as const }, { rank: 'J' as const, suit: '♣' as const }],
      [{ rank: 'T' as const, suit: '♠' as const }, { rank: 'T' as const, suit: '♥' as const }],
    ];

    return decentHands[Math.floor(Math.random() * decentHands.length)];
  }

  // Generate villain stats based on difficulty
  private static generateVillainStats(
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  ): PlayerStats {
    const statRanges = {
      beginner: {
        vpip: [40, 60],
        pfr: [15, 25],
        aggression: [1.0, 2.0],
        foldToCBet: [55, 70],
        threeBet: [3, 7]
      },
      intermediate: {
        vpip: [25, 35],
        pfr: [18, 28],
        aggression: [1.5, 2.5],
        foldToCBet: [45, 60],
        threeBet: [6, 10]
      },
      advanced: {
        vpip: [20, 28],
        pfr: [16, 24],
        aggression: [2.0, 3.0],
        foldToCBet: [40, 55],
        threeBet: [8, 12]
      },
      expert: {
        vpip: [18, 25],
        pfr: [15, 22],
        aggression: [2.5, 3.5],
        foldToCBet: [35, 50],
        threeBet: [9, 14]
      }
    };

    const ranges = statRanges[difficulty];

    return {
      vpip: this.randomInRange(ranges.vpip[0], ranges.vpip[1]),
      pfr: this.randomInRange(ranges.pfr[0], ranges.pfr[1]),
      aggression: this.randomInRange(ranges.aggression[0], ranges.aggression[1]),
      foldToCBet: this.randomInRange(ranges.foldToCBet[0], ranges.foldToCBet[1]),
      threeBet: this.randomInRange(ranges.threeBet[0], ranges.threeBet[1])
    };
  }

  private static randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  // Generate unique scenario ID
  private static generateScenarioId(): string {
    return `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Calculate accuracy by street
  static getAccuracyByStreet(results: DecisionResult[]): {
    preflop: number;
    flop: number;
    turn: number;
    river: number;
  } {
    const streetResults = {
      preflop: { correct: 0, total: 0 },
      flop: { correct: 0, total: 0 },
      turn: { correct: 0, total: 0 },
      river: { correct: 0, total: 0 }
    };

    // This would need to track street info in DecisionResult
    // For now, distribute evenly
    results.forEach((result, index) => {
      const street: Street = ['preflop', 'flop', 'turn', 'river'][index % 4] as Street;
      streetResults[street].total++;
      if (result.correct) {
        streetResults[street].correct++;
      }
    });

    return {
      preflop: streetResults.preflop.total > 0
        ? streetResults.preflop.correct / streetResults.preflop.total
        : 0,
      flop: streetResults.flop.total > 0
        ? streetResults.flop.correct / streetResults.flop.total
        : 0,
      turn: streetResults.turn.total > 0
        ? streetResults.turn.correct / streetResults.turn.total
        : 0,
      river: streetResults.river.total > 0
        ? streetResults.river.correct / streetResults.river.total
        : 0
    };
  }

  // Track result for learning
  addResult(result: DecisionResult): void {
    this.results.push(result);

    // Track weakness patterns
    if (!result.correct) {
      const pattern = `${result.userAction.action}_error`;
      this.weaknessPatterns.set(
        pattern,
        (this.weaknessPatterns.get(pattern) || 0) + 1
      );
    }
  }

  // Get current results
  getResults(): DecisionResult[] {
    return this.results;
  }

  // Clear results
  clearResults(): void {
    this.results = [];
    this.weaknessPatterns.clear();
  }

  // Get session stats
  getSessionStats(): {
    accuracy: number;
    avgEvLoss: number;
    totalHands: number;
  } {
    if (this.results.length === 0) {
      return { accuracy: 0, avgEvLoss: 0, totalHands: 0 };
    }

    const correct = this.results.filter(r => r.correct).length;
    const avgEvLoss = this.results.reduce((sum, r) => sum + r.evLoss, 0) / this.results.length;

    return {
      accuracy: correct / this.results.length,
      avgEvLoss,
      totalHands: this.results.length
    };
  }
}
