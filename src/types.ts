// Core poker types
export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type Position = 'UTG' | 'MP' | 'CO' | 'BTN' | 'SB' | 'BB';

export type Action = 'fold' | 'call' | 'raise' | 'check' | 'bet';

export interface PlayerAction {
  action: Action;
  amount?: number;
  position: Position;
}

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export interface GameState {
  heroPosition: Position;
  villainPosition: Position;
  street: Street;
  pot: number;
  heroStack: number;
  villainStack: number;
  heroCards: Card[];
  board: Card[];
  actionHistory: PlayerAction[];
  currentBet: number;
  lastAction?: PlayerAction;
}

export interface HandRange {
  hands: string[];
  frequency: number;
}

export interface StrategyAction {
  action: Action;
  amount?: number;
  frequency: number;
  evLoss?: number; // Expected value loss compared to optimal
}

export interface GTOStrategy {
  actions: StrategyAction[];
  expectedValue: number;
}

export interface ExploitativeAdjustment {
  adjustment: string;
  reason: string;
  frequency: number;
}

export interface TrainingScenario {
  id: string;
  gameState: GameState;
  gtoStrategy: GTOStrategy;
  exploitativeAdjustments?: ExploitativeAdjustment[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface PlayerStats {
  vpip: number; // Voluntarily put money in pot
  pfr: number; // Pre-flop raise
  aggression: number;
  foldToCBet: number;
  threeBet: number;
}

export interface DecisionResult {
  userAction: PlayerAction;
  optimalAction: PlayerAction;
  evLoss: number;
  feedback: string;
  correct: boolean;
}

export interface LearningMetrics {
  totalHands: number;
  correctDecisions: number;
  avgEvLoss: number;
  strengthsByStreet: {
    preflop: number;
    flop: number;
    turn: number;
    river: number;
  };
  weaknesses: string[];
  improvementAreas: string[];
}

export interface TrainingSession {
  startTime: number;
  handsPlayed: number;
  results: DecisionResult[];
  metrics: LearningMetrics;
}

// Hand strength categories
export type HandStrength =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush';

export interface HandEvaluation {
  strength: HandStrength;
  rank: number; // 0-7462 (lower is better)
  description: string;
}

// UI State
export interface UIState {
  mode: 'gto' | 'exploitative' | 'mixed';
  showHints: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  autoProgress: boolean;
  speed: 'slow' | 'normal' | 'fast';
}

export interface FeedbackMessage {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  details?: string;
}
