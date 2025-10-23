# GTO Poker Trainer

A comprehensive poker training application that helps players master both Game Theory Optimal (GTO) and exploitative strategies through adaptive learning.

## Features

### Training Modes
- **GTO Mode**: Learn optimal poker strategy with balanced play
- **Exploitative Mode**: Adapt your strategy based on opponent tendencies
- **Mixed Mode**: Combine GTO fundamentals with exploitative adjustments

### Adaptive Learning System
- **Performance Tracking**: Monitor your accuracy and EV loss across all streets
- **Weakness Identification**: Automatically identifies areas needing improvement
- **Personalized Scenarios**: Training hands tailored to your weaknesses
- **Difficulty Levels**: Beginner, Intermediate, Advanced, and Expert modes

### Comprehensive Feedback
- **Real-time Analysis**: Instant feedback on every decision
- **EV Loss Calculation**: Understand the cost of suboptimal plays
- **Strategy Breakdown**: See optimal action frequencies for each situation
- **Improvement Recommendations**: Get specific advice on what to study

### Interactive Features
- **Visual Poker Table**: Realistic poker table interface
- **Dynamic Scenarios**: Face different positions, stack sizes, and board textures
- **Hint System**: Toggle hints to see GTO recommendations
- **Progress Metrics**: Track improvement over time

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Custom CSS with responsive design
- **Game Engine**: Custom poker hand evaluator and GTO solver
- **Learning System**: Adaptive difficulty and personalized training

## Getting Started

### Prerequisites
- Node.js 16+ and npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd gto-poker-trainer

# Install dependencies
npm install

# Start the development server
npm start
```

The application will open at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

## Project Structure

```
gto-poker-trainer/
├── src/
│   ├── engine/
│   │   ├── PokerEngine.ts       # Game mechanics and hand evaluation
│   │   ├── GTOSolver.ts         # GTO strategy calculations
│   │   └── LearningSystem.ts    # Adaptive learning algorithms
│   ├── types.ts                 # TypeScript type definitions
│   ├── App.tsx                  # Main React component
│   ├── App.css                  # Application styling
│   ├── index.tsx                # Application entry point
│   └── index.css                # Global styles
├── public/
│   ├── index.html               # HTML template
│   └── manifest.json            # PWA manifest
├── package.json                 # Dependencies and scripts
└── tsconfig.json                # TypeScript configuration
```

## How to Use

1. **Select Training Mode**: Choose between GTO, Exploitative, or Mixed mode
2. **Choose Difficulty**: Pick a difficulty level matching your skill
3. **Make Decisions**: Analyze the situation and select your action
4. **Learn from Feedback**: Review the optimal play and your EV loss
5. **Track Progress**: Monitor your metrics to identify strengths and weaknesses
6. **Improve**: Focus on recommended areas and watch your accuracy increase

## Key Concepts

### GTO (Game Theory Optimal)
- Balanced strategy that cannot be exploited
- Uses mixed frequencies to remain unpredictable
- Foundation for solid poker play

### Exploitative Play
- Adjusts strategy based on opponent tendencies
- Maximizes profit against specific player types
- Requires accurate opponent reads

### EV (Expected Value)
- The average outcome of a decision over many trials
- Positive EV decisions are profitable long-term
- Measured as a percentage of the pot

### Street-Specific Skills
- **Preflop**: Hand selection and position awareness
- **Flop**: Board texture reading and continuation betting
- **Turn**: Barreling strategy and pot control
- **River**: Value betting and bluff catching

## Learning Metrics

The application tracks several key metrics:

- **Total Hands**: Number of training hands completed
- **Accuracy**: Percentage of correct decisions
- **Average EV Loss**: How much EV you're losing per decision
- **Street Strengths**: Performance breakdown by street
- **Weaknesses**: Identified problem areas
- **Improvement Areas**: Specific recommendations for study

## Advanced Features

### Adaptive Difficulty
The learning system automatically adjusts scenario complexity based on your performance:
- Stronger players face tougher spots
- Weaker areas receive more practice
- Gradual difficulty increase as you improve

### Exploitative Adjustments
In Exploitative mode, you'll see recommendations like:
- "Value bet more vs loose players"
- "Bluff more vs passive opponents"
- "Defend more vs aggressive players"

### Hint System
Enable hints to see:
- Recommended action with frequency
- Full GTO strategy breakdown
- Visual frequency bars for all actions

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with React and TypeScript
- Poker hand evaluation algorithms
- GTO strategy fundamentals
- Adaptive learning principles

## Future Enhancements

Planned features:
- Multi-way pot scenarios
- Tournament ICM situations
- Range visualization
- Hand history review
- Custom scenario creation
- Progress export/import
- Mobile app version

---

**Happy Training!** Master GTO fundamentals, learn to exploit opponents, and take your poker game to the next level.
