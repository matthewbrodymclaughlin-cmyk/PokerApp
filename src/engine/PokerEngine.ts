import {
  Card,
  Rank,
  Suit,
  HandEvaluation,
  HandStrength,
  GameState,
  Position,
  Action,
  PlayerAction,
} from '../types';

export class PokerEngine {
  private static readonly RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  private static readonly SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
  private static readonly RANK_VALUES: { [key in Rank]: number } = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };

  // Create a shuffled deck
  static createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of this.SUITS) {
      for (const rank of this.RANKS) {
        deck.push({ rank, suit });
      }
    }
    return this.shuffleDeck(deck);
  }

  // Fisher-Yates shuffle
  static shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Deal cards from deck
  static dealCards(deck: Card[], count: number): { cards: Card[], remainingDeck: Card[] } {
    const cards = deck.slice(0, count);
    const remainingDeck = deck.slice(count);
    return { cards, remainingDeck };
  }

  // Evaluate a 5-7 card poker hand
  static evaluateHand(cards: Card[]): HandEvaluation {
    if (cards.length < 5) {
      return {
        strength: 'high-card',
        rank: 7462,
        description: 'Incomplete hand'
      };
    }

    // For 6 or 7 cards, evaluate all 5-card combinations
    if (cards.length > 5) {
      return this.evaluateBestHand(cards);
    }

    const sorted = [...cards].sort((a, b) =>
      this.RANK_VALUES[b.rank] - this.RANK_VALUES[a.rank]
    );

    const isFlush = this.checkFlush(sorted);
    const isStraight = this.checkStraight(sorted);
    const rankCounts = this.getRankCounts(sorted);

    // Check for each hand type (best to worst)
    if (isFlush && isStraight) {
      return {
        strength: 'straight-flush',
        rank: this.calculateRank('straight-flush', sorted),
        description: `Straight Flush, ${sorted[0].rank} high`
      };
    }

    if (rankCounts[4]) {
      return {
        strength: 'four-of-a-kind',
        rank: this.calculateRank('four-of-a-kind', sorted),
        description: `Four of a Kind, ${rankCounts[4][0]}s`
      };
    }

    if (rankCounts[3] && rankCounts[2]) {
      return {
        strength: 'full-house',
        rank: this.calculateRank('full-house', sorted),
        description: `Full House, ${rankCounts[3][0]}s over ${rankCounts[2][0]}s`
      };
    }

    if (isFlush) {
      return {
        strength: 'flush',
        rank: this.calculateRank('flush', sorted),
        description: `Flush, ${sorted[0].rank} high`
      };
    }

    if (isStraight) {
      return {
        strength: 'straight',
        rank: this.calculateRank('straight', sorted),
        description: `Straight, ${sorted[0].rank} high`
      };
    }

    if (rankCounts[3]) {
      return {
        strength: 'three-of-a-kind',
        rank: this.calculateRank('three-of-a-kind', sorted),
        description: `Three of a Kind, ${rankCounts[3][0]}s`
      };
    }

    if (rankCounts[2] && rankCounts[2].length >= 2) {
      return {
        strength: 'two-pair',
        rank: this.calculateRank('two-pair', sorted),
        description: `Two Pair, ${rankCounts[2][0]}s and ${rankCounts[2][1]}s`
      };
    }

    if (rankCounts[2]) {
      return {
        strength: 'pair',
        rank: this.calculateRank('pair', sorted),
        description: `Pair of ${rankCounts[2][0]}s`
      };
    }

    return {
      strength: 'high-card',
      rank: this.calculateRank('high-card', sorted),
      description: `${sorted[0].rank} high`
    };
  }

  // Evaluate best 5-card hand from 6 or 7 cards
  private static evaluateBestHand(cards: Card[]): HandEvaluation {
    const combinations = this.getCombinations(cards, 5);
    let bestEval: HandEvaluation = {
      strength: 'high-card',
      rank: 7462,
      description: 'High card'
    };

    for (const combo of combinations) {
      const handEval = this.evaluateHand(combo);
      if (handEval.rank < bestEval.rank) {
        bestEval = handEval;
      }
    }

    return bestEval;
  }

  // Generate all combinations of size k from array
  private static getCombinations(arr: Card[], k: number): Card[][] {
    if (k === 1) return arr.map(item => [item]);
    if (k === arr.length) return [arr];

    const result: Card[][] = [];
    for (let i = 0; i <= arr.length - k; i++) {
      const first = arr[i];
      const rest = arr.slice(i + 1);
      const subCombos = this.getCombinations(rest, k - 1);
      for (const combo of subCombos) {
        result.push([first, ...combo]);
      }
    }
    return result;
  }

  private static checkFlush(cards: Card[]): boolean {
    const firstSuit = cards[0].suit;
    return cards.every(card => card.suit === firstSuit);
  }

  private static checkStraight(cards: Card[]): boolean {
    const values = cards.map(c => this.RANK_VALUES[c.rank]);

    // Check for regular straight
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i] - values[i + 1] !== 1) {
        // Check for wheel (A-2-3-4-5)
        if (i === 0 && values[0] === 14 && values[1] === 5 &&
            values[2] === 4 && values[3] === 3 && values[4] === 2) {
          return true;
        }
        return false;
      }
    }
    return true;
  }

  private static getRankCounts(cards: Card[]): { [count: number]: Rank[] } {
    const counts = new Map<Rank, number>();
    for (const card of cards) {
      counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
    }

    const result: { [count: number]: Rank[] } = {};
    for (const [rank, count] of Array.from(counts.entries())) {
      if (!result[count]) result[count] = [];
      result[count].push(rank);
    }

    // Sort each group by rank value (descending)
    for (const count in result) {
      result[count].sort((a, b) => this.RANK_VALUES[b] - this.RANK_VALUES[a]);
    }

    return result;
  }

  // Simplified rank calculation (lower is better, 0-7462)
  private static calculateRank(strength: HandStrength, cards: Card[]): number {
    const strengthRanks = {
      'straight-flush': 10,
      'four-of-a-kind': 166,
      'full-house': 322,
      'flush': 1599,
      'straight': 1609,
      'three-of-a-kind': 2467,
      'two-pair': 3325,
      'pair': 6185,
      'high-card': 7462
    };

    return strengthRanks[strength];
  }

  // Convert card to string representation
  static cardToString(card: Card): string {
    return `${card.rank}${card.suit}`;
  }

  // Parse string to card
  static stringToCard(str: string): Card {
    const rank = str[0] as Rank;
    const suit = str[1] as Suit;
    return { rank, suit };
  }

  // Get hand range string (e.g., "AKs", "QQ+", "76o")
  static getHandString(card1: Card, card2: Card): string {
    const rank1 = card1.rank;
    const rank2 = card2.rank;
    const suited = card1.suit === card2.suit ? 's' : 'o';

    const val1 = this.RANK_VALUES[rank1];
    const val2 = this.RANK_VALUES[rank2];

    if (val1 === val2) {
      return `${rank1}${rank2}`;
    }

    return val1 > val2 ? `${rank1}${rank2}${suited}` : `${rank2}${rank1}${suited}`;
  }

  // Initialize a new game state
  static initializeGame(heroPosition: Position, villainPosition: Position): GameState {
    const deck = this.createDeck();
    const { cards: heroCards } = this.dealCards(deck, 2);

    return {
      heroPosition,
      villainPosition,
      street: 'preflop',
      pot: 15, // 10 BB + 5 SB
      heroStack: 1000,
      villainStack: 1000,
      heroCards,
      board: [],
      actionHistory: [],
      currentBet: 10,
      lastAction: undefined
    };
  }

  // Process player action and update game state
  static processAction(state: GameState, action: PlayerAction): GameState {
    const newState = { ...state };
    newState.actionHistory = [...state.actionHistory, action];
    newState.lastAction = action;

    switch (action.action) {
      case 'fold':
        // Hand ends
        break;
      case 'call':
        newState.pot += action.amount || 0;
        if (action.position === state.heroPosition) {
          newState.heroStack -= action.amount || 0;
        } else {
          newState.villainStack -= action.amount || 0;
        }
        newState.currentBet = 0;
        break;
      case 'raise':
      case 'bet':
        newState.pot += action.amount || 0;
        if (action.position === state.heroPosition) {
          newState.heroStack -= action.amount || 0;
        } else {
          newState.villainStack -= action.amount || 0;
        }
        newState.currentBet = action.amount || 0;
        break;
      case 'check':
        // No money changes
        break;
    }

    return newState;
  }

  // Advance to next street
  static advanceStreet(state: GameState, deck: Card[]): GameState {
    const newState = { ...state };
    let cardsToAdd = 0;

    switch (state.street) {
      case 'preflop':
        newState.street = 'flop';
        cardsToAdd = 3;
        break;
      case 'flop':
        newState.street = 'turn';
        cardsToAdd = 1;
        break;
      case 'turn':
        newState.street = 'river';
        cardsToAdd = 1;
        break;
      case 'river':
        // Hand complete
        break;
    }

    if (cardsToAdd > 0) {
      const { cards } = this.dealCards(deck, cardsToAdd);
      newState.board = [...state.board, ...cards];
    }

    newState.currentBet = 0;
    return newState;
  }

  // Get valid actions for current game state
  static getValidActions(state: GameState): Action[] {
    const actions: Action[] = [];

    if (state.currentBet === 0) {
      actions.push('check', 'bet');
    } else {
      actions.push('fold', 'call', 'raise');
    }

    return actions;
  }

  // Calculate pot odds
  static calculatePotOdds(pot: number, betToCall: number): number {
    return betToCall / (pot + betToCall);
  }

  // Get position index (0-5, UTG to BB)
  static getPositionIndex(position: Position): number {
    const positions: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
    return positions.indexOf(position);
  }

  // Check if position is in late position
  static isLatePosition(position: Position): boolean {
    return ['CO', 'BTN'].includes(position);
  }

  // Check if position is in early position
  static isEarlyPosition(position: Position): boolean {
    return ['UTG', 'MP'].includes(position);
  }
}
