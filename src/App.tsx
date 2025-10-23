import React, { useState, useEffect } from 'react';
import './App.css';
import {
  GameState,
  Action,
  UIState,
  LearningMetrics,
  TrainingScenario,
  DecisionResult,
  FeedbackMessage,
  PlayerAction,
  Card,
} from './types';
import { PokerEngine } from './engine/PokerEngine';
import { GTOSolver } from './engine/GTOSolver';
import { LearningSystem } from './engine/LearningSystem';

function App() {
  // Game state
  const [scenario, setScenario] = useState<TrainingScenario | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  // UI state
  const [uiState, setUiState] = useState<UIState>({
    mode: 'gto',
    showHints: false,
    difficulty: 'beginner',
    autoProgress: false,
    speed: 'normal'
  });

  // Learning state
  const [metrics, setMetrics] = useState<LearningMetrics>(LearningSystem.initializeMetrics());
  const [learningSystem] = useState(new LearningSystem());

  // Initialize first scenario
  useEffect(() => {
    startNewHand();
    // eslint-disable-next-line
  }, []);

  // Start a new training hand
  const startNewHand = () => {
    const newScenario = LearningSystem.generateScenario(metrics, uiState.difficulty);
    setScenario(newScenario);
    setGameState(newScenario.gameState);
    setShowResults(false);
    setFeedback(null);
  };

  // Handle player action
  const handleAction = (action: Action, amount?: number) => {
    if (!scenario || !gameState) return;

    const playerAction: PlayerAction = {
      action,
      amount,
      position: gameState.heroPosition
    };

    // Evaluate decision
    const evaluation = GTOSolver.evaluateDecision(
      action,
      amount,
      scenario.gtoStrategy
    );

    const result: DecisionResult = {
      userAction: playerAction,
      optimalAction: {
        action: GTOSolver.getRecommendedAction(scenario.gtoStrategy).action,
        amount: GTOSolver.getRecommendedAction(scenario.gtoStrategy).amount,
        position: gameState.heroPosition
      },
      evLoss: evaluation.evLoss,
      feedback: evaluation.feedback,
      correct: evaluation.correct
    };

    // Update learning system
    learningSystem.addResult(result);
    const newMetrics = LearningSystem.updateMetrics(metrics, result, gameState.street);
    newMetrics.weaknesses = LearningSystem.identifyWeaknesses(
      learningSystem.getResults(),
      newMetrics
    );
    newMetrics.improvementAreas = LearningSystem.getImprovementAreas(newMetrics.weaknesses);
    setMetrics(newMetrics);

    // Show feedback
    setFeedback({
      type: result.correct ? 'success' : result.evLoss > 0.20 ? 'error' : 'warning',
      message: result.feedback,
      details: `EV Loss: ${(result.evLoss * 100).toFixed(1)}%`
    });

    setShowResults(true);

    // Auto-progress to next hand
    if (uiState.autoProgress) {
      setTimeout(() => {
        startNewHand();
      }, 3000);
    }
  };

  // Render card component
  const renderCard = (card: Card, hidden: boolean = false) => {
    if (hidden) {
      return <div className="card card-back">🂠</div>;
    }

    const suitColor = ['♥', '♦'].includes(card.suit) ? 'red' : 'black';
    return (
      <div className={`card card-${suitColor}`}>
        <div className="card-rank">{card.rank}</div>
        <div className="card-suit">{card.suit}</div>
      </div>
    );
  };

  // Render action buttons
  const renderActionButtons = () => {
    if (!gameState || showResults) return null;

    const validActions = PokerEngine.getValidActions(gameState);
    const betAmount = Math.floor(gameState.pot * 0.66);
    const raiseAmount = gameState.currentBet * 3;

    return (
      <div className="action-buttons">
        {validActions.includes('fold') && (
          <button
            className="action-btn fold-btn"
            onClick={() => handleAction('fold')}
          >
            Fold
          </button>
        )}
        {validActions.includes('check') && (
          <button
            className="action-btn check-btn"
            onClick={() => handleAction('check')}
          >
            Check
          </button>
        )}
        {validActions.includes('call') && (
          <button
            className="action-btn call-btn"
            onClick={() => handleAction('call', gameState.currentBet)}
          >
            Call {gameState.currentBet}
          </button>
        )}
        {validActions.includes('bet') && (
          <button
            className="action-btn bet-btn"
            onClick={() => handleAction('bet', betAmount)}
          >
            Bet {betAmount}
          </button>
        )}
        {validActions.includes('raise') && (
          <button
            className="action-btn raise-btn"
            onClick={() => handleAction('raise', raiseAmount)}
          >
            Raise {raiseAmount}
          </button>
        )}
      </div>
    );
  };

  // Render GTO strategy hint
  const renderHint = () => {
    if (!scenario || !uiState.showHints) return null;

    const recommendedAction = GTOSolver.getRecommendedAction(scenario.gtoStrategy);

    return (
      <div className="hint-panel">
        <h4>💡 GTO Recommendation</h4>
        <div className="hint-content">
          <div className="recommended-action">
            <strong>{recommendedAction.action.toUpperCase()}</strong>
            {recommendedAction.amount && ` ${recommendedAction.amount}`}
          </div>
          <div className="action-frequency">
            Frequency: {(recommendedAction.frequency * 100).toFixed(1)}%
          </div>
        </div>
        <div className="strategy-breakdown">
          <h5>Full Strategy:</h5>
          {scenario.gtoStrategy.actions.map((action, idx) => (
            <div key={idx} className="strategy-action">
              <span className="action-name">{action.action}</span>
              <div className="frequency-bar">
                <div
                  className="frequency-fill"
                  style={{ width: `${action.frequency * 100}%` }}
                />
              </div>
              <span className="frequency-text">
                {(action.frequency * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render exploitative adjustments
  const renderExploitativeAdjustments = () => {
    if (!scenario?.exploitativeAdjustments || uiState.mode !== 'exploitative') return null;

    return (
      <div className="exploitative-panel">
        <h4>🎯 Exploitative Adjustments</h4>
        {scenario.exploitativeAdjustments.map((adj, idx) => (
          <div key={idx} className="adjustment-item">
            <div className="adjustment-action">{adj.adjustment}</div>
            <div className="adjustment-reason">{adj.reason}</div>
            <div className="adjustment-frequency">
              Adjust by: {(adj.frequency * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render learning metrics
  const renderMetrics = () => {
    const sessionStats = learningSystem.getSessionStats();

    return (
      <div className="metrics-panel">
        <h3>📊 Learning Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-label">Total Hands</div>
            <div className="metric-value">{metrics.totalHands}</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Accuracy</div>
            <div className="metric-value">
              {metrics.totalHands > 0
                ? ((metrics.correctDecisions / metrics.totalHands) * 100).toFixed(1)
                : 0}%
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Avg EV Loss</div>
            <div className="metric-value">
              {(metrics.avgEvLoss * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="street-strengths">
          <h4>Accuracy by Street</h4>
          {Object.entries(metrics.strengthsByStreet).map(([street, strength]) => (
            <div key={street} className="street-item">
              <span className="street-name">{street}</span>
              <div className="strength-bar">
                <div
                  className="strength-fill"
                  style={{
                    width: `${strength * 100}%`,
                    backgroundColor: strength > 0.7 ? '#4caf50' : strength > 0.5 ? '#ff9800' : '#f44336'
                  }}
                />
              </div>
              <span className="strength-value">{(strength * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>

        {metrics.weaknesses.length > 0 && (
          <div className="weaknesses-section">
            <h4>Areas for Improvement</h4>
            <ul>
              {metrics.weaknesses.slice(0, 3).map((weakness, idx) => (
                <li key={idx}>{weakness}</li>
              ))}
            </ul>
          </div>
        )}

        {metrics.improvementAreas.length > 0 && (
          <div className="improvements-section">
            <h4>Recommended Focus</h4>
            <ul>
              {metrics.improvementAreas.slice(0, 3).map((area, idx) => (
                <li key={idx}>{area}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (!gameState || !scenario) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>♠️ GTO Poker Trainer</h1>
        <div className="header-controls">
          <select
            value={uiState.mode}
            onChange={(e) => setUiState({ ...uiState, mode: e.target.value as any })}
          >
            <option value="gto">GTO Mode</option>
            <option value="exploitative">Exploitative Mode</option>
            <option value="mixed">Mixed Mode</option>
          </select>
          <select
            value={uiState.difficulty}
            onChange={(e) => setUiState({ ...uiState, difficulty: e.target.value as any })}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={uiState.showHints}
              onChange={(e) => setUiState({ ...uiState, showHints: e.target.checked })}
            />
            Show Hints
          </label>
        </div>
      </header>

      <div className="main-content">
        <div className="poker-table-container">
          <div className="poker-table">
            {/* Villain */}
            <div className="player villain-position">
              <div className="player-info">
                <div className="player-name">Villain ({gameState.villainPosition})</div>
                <div className="player-stack">{gameState.villainStack}</div>
              </div>
              <div className="player-cards">
                {renderCard({ rank: 'A', suit: '♠' }, true)}
                {renderCard({ rank: 'A', suit: '♠' }, true)}
              </div>
            </div>

            {/* Board */}
            <div className="board-container">
              <div className="pot-info">
                <div className="pot-label">Pot</div>
                <div className="pot-amount">{gameState.pot}</div>
              </div>
              <div className="board">
                {gameState.board.length > 0 ? (
                  gameState.board.map((card, idx) => (
                    <React.Fragment key={idx}>{renderCard(card)}</React.Fragment>
                  ))
                ) : (
                  <div className="board-placeholder">
                    {gameState.street.toUpperCase()}
                  </div>
                )}
              </div>
              {gameState.currentBet > 0 && (
                <div className="current-bet">
                  Current Bet: {gameState.currentBet}
                </div>
              )}
            </div>

            {/* Hero */}
            <div className="player hero-position">
              <div className="player-info">
                <div className="player-name">Hero ({gameState.heroPosition})</div>
                <div className="player-stack">{gameState.heroStack}</div>
              </div>
              <div className="player-cards">
                {renderCard(gameState.heroCards[0])}
                {renderCard(gameState.heroCards[1])}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {renderActionButtons()}

          {/* Feedback message */}
          {feedback && (
            <div className={`feedback-message feedback-${feedback.type}`}>
              <div className="feedback-text">{feedback.message}</div>
              {feedback.details && (
                <div className="feedback-details">{feedback.details}</div>
              )}
            </div>
          )}

          {/* Next hand button */}
          {showResults && (
            <button className="next-hand-btn" onClick={startNewHand}>
              Next Hand →
            </button>
          )}
        </div>

        <div className="side-panel">
          {renderMetrics()}
          {renderHint()}
          {renderExploitativeAdjustments()}
        </div>
      </div>
    </div>
  );
}

export default App;
