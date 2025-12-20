class AITimeArcade {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        
        // Default game parameters (never modified) - Increased speed for better mobile experience
        this.defaultParams = {
            speed: 2.5, // Faster base speed
            obstacleFrequency: 0.015, // More frequent but manageable
            gravity: 0.5, // Slightly stronger gravity
            jumpPower: 14, // Higher jump to compensate
            controlSensitivity: 1.2 // More responsive controls
        };
        
        // Game parameters (AI will modify these) - Made much easier
        this.gameParams = { ...this.defaultParams };
        
        // Player object (Mario-style character)
        this.player = {
            x: 100,
            y: 400,
            width: 24,
            height: 32,
            vx: 0,
            vy: 0,
            onGround: false,
            color: '#00ff00'
        };
        
        // Game objects
        this.obstacles = [];
        this.collectibles = [];
        this.particles = [];
        
        // Game stats
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameTime = 0;
        this.highScore = localStorage.getItem('aiArcadeHighScore') || 0;
        
        // AI tracking data
        this.aiData = {
            survivalTime: 0,
            movementPatterns: [],
            reactionTimes: [],
            errorCount: 0,
            lastAnalysis: 0,
            adaptationHistory: []
        };
        
        // Input handling
        this.keys = {};
        this.setupEventListeners();
        
        // Start game loop
        this.lastTime = 0;
        this.gameLoop();
    }
    
    setupEventListeners() {
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            // Prevent repeated jumps from holding space
            if (e.code === 'Space') {
                e.preventDefault();
                if (!this.keys[e.code]) { // Only jump if space wasn't already pressed
                    this.jump();
                }
            }
            this.keys[e.code] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Button controls
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (startBtn) {
            console.log('✅ Start button found and connected');
            startBtn.addEventListener('click', () => {
                console.log('🎮 Start button clicked!');
                this.startGame();
            });
        } else {
            console.error('❌ Start button not found!');
        }
        
        if (pauseBtn) {
            console.log('✅ Pause button found and connected');
            pauseBtn.addEventListener('click', () => {
                console.log('⏸️ Pause button clicked!');
                this.togglePause();
            });
        } else {
            console.error('❌ Pause button not found!');
        }
        
        // Mobile controls
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        const jumpBtn = document.getElementById('jumpBtn');
        
        if (leftBtn) {
            leftBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys['ArrowLeft'] = true;
            });
            leftBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys['ArrowLeft'] = false;
            });
            leftBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.keys['ArrowLeft'] = true;
            });
            leftBtn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                this.keys['ArrowLeft'] = false;
            });
        }
        
        if (rightBtn) {
            rightBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys['ArrowRight'] = true;
            });
            rightBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys['ArrowRight'] = false;
            });
            rightBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.keys['ArrowRight'] = true;
            });
            rightBtn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                this.keys['ArrowRight'] = false;
            });
        }
        
        if (jumpBtn) {
            jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.jump();
            });
            jumpBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.jump();
            });
        }
        
        console.log('📱 Mobile controls initialized');
        
        // AI Demo button (desktop only)
        const aiDemoBtn = document.getElementById('aiDemoBtn');
        if (aiDemoBtn) {
            aiDemoBtn.addEventListener('click', () => {
                this.showAIDemo();
            });
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        this.resetGame();
        document.getElementById('startBtn').textContent = 'RESTART';
        
        // Always hide AI panel on mobile during gameplay
        if (window.innerWidth <= 768) {
            document.querySelector('.ai-panel').style.display = 'none';
        }
        
        // Show initial AI message with tutorial
        document.getElementById('aiReason').textContent = '🎮 Game started! AI is analyzing your gameplay and adapting difficulty.';
        
        // Only show notification on desktop
        if (window.innerWidth > 768) {
            this.showAINotification('GAME_START', '🔄 Game started! AI adapting to your play style.');
        }
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseBtn').textContent = 'RESUME';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseBtn').textContent = 'PAUSE';
        }
    }
    
    resetGame() {
        // Reset player
        this.player.x = 100;
        this.player.y = 400;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.onGround = false;
        
        // Reset game objects
        this.obstacles = [];
        this.collectibles = [];
        this.particles = [];
        
        // Reset game stats
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameTime = 0;
        
        // Reset AI data
        this.aiData.survivalTime = 0;
        this.aiData.errorCount = 0;
        this.aiData.movementPatterns = [];
        this.aiData.reactionTimes = [];
        this.aiData.lastAnalysis = 0;
        this.aiData.adaptationHistory = [];
        
        // IMPORTANT: Reset game parameters to default values
        this.gameParams = { ...this.defaultParams };
        
        // Update UI
        this.updateUI();
        this.updateParameterBars();
        
        console.log('🔄 Game reset - All parameters restored to defaults');
        console.log('Jump Power:', this.gameParams.jumpPower, 'Gravity:', this.gameParams.gravity);
    }
    
    jump() {
        if (this.gameState === 'playing' && this.player.onGround) {
            this.player.vy = -this.gameParams.jumpPower;
            this.player.onGround = false;
        }
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        this.gameTime += deltaTime;
        this.aiData.survivalTime += deltaTime;
        
        // Update player
        this.updatePlayer(deltaTime);
        
        // Update game objects
        this.updateObstacles(deltaTime);
        this.updateCollectibles(deltaTime);
        this.updateParticles(deltaTime);
        
        // Spawn new objects
        this.spawnObjects();
        
        // Check collisions
        this.checkCollisions();
        
        // AI analysis (every 2 seconds for more visible changes)
        if (this.gameTime - this.aiData.lastAnalysis > 2000) {
            this.performAIAnalysis();
            this.aiData.lastAnalysis = this.gameTime;
        }
        
        // Update UI
        this.updateUI();
    }
    
    updatePlayer(deltaTime) {
        // Horizontal movement - Faster for better mobile experience
        if (this.keys['ArrowLeft']) {
            this.player.vx = -4 * this.gameParams.controlSensitivity;
        } else if (this.keys['ArrowRight']) {
            this.player.vx = 4 * this.gameParams.controlSensitivity;
        } else {
            this.player.vx *= 0.85; // Less friction for smoother movement
        }
        
        // Gravity
        this.player.vy += this.gameParams.gravity;
        
        // Update position
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;
        
        // Ground collision
        if (this.player.y + this.player.height >= this.canvas.height - 50) {
            this.player.y = this.canvas.height - 50 - this.player.height;
            this.player.vy = 0;
            this.player.onGround = true;
        }
        
        // Ceiling boundary - prevent going too high
        if (this.player.y < 0) {
            this.player.y = 0;
            this.player.vy = 0; // Stop upward movement
        }
        
        // Screen boundaries
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > this.canvas.width) {
            this.player.x = this.canvas.width - this.player.width;
        }
        
        // Track movement patterns for AI
        this.aiData.movementPatterns.push({
            x: this.player.x,
            y: this.player.y,
            time: this.gameTime
        });
        
        // Keep only last 100 movement points
        if (this.aiData.movementPatterns.length > 100) {
            this.aiData.movementPatterns.shift();
        }
    }
    
    updateObstacles(deltaTime) {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.x -= this.gameParams.speed;
            
            // Remove off-screen obstacles
            if (obstacle.x + obstacle.width < 0) {
                this.obstacles.splice(i, 1);
                this.score += 10; // Survived an obstacle
            }
        }
    }
    
    updateCollectibles(deltaTime) {
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];
            collectible.x -= this.gameParams.speed;
            collectible.rotation += 0.1;
            
            // Remove off-screen collectibles
            if (collectible.x + collectible.width < 0) {
                this.collectibles.splice(i, 1);
            }
        }
    }
    
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= deltaTime;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    spawnObjects() {
        // Spawn obstacles - Retro enemies
        if (Math.random() < this.gameParams.obstacleFrequency) {
            this.obstacles.push({
                x: this.canvas.width,
                y: this.canvas.height - 50 - 28,
                width: 28,
                height: 28,
                color: '#ff0000'
            });
        }
        
        // Spawn collectibles - More frequent and easier to reach
        if (Math.random() < 0.015) { // Much more frequent
            const groundY = this.canvas.height - 50;
            const maxJumpHeight = 80; // Match reduced jump capability
            const collectibleY = groundY - Math.random() * maxJumpHeight - 15; // Lower minimum height
            
            this.collectibles.push({
                x: this.canvas.width,
                y: collectibleY,
                width: 20, // Coin size
                height: 20,
                color: '#ffff00',
                rotation: 0
            });
        }
    }
    
    checkCollisions() {
        // Check obstacle collisions
        for (const obstacle of this.obstacles) {
            if (this.isColliding(this.player, obstacle)) {
                this.playerHit();
                break;
            }
        }
        
        // Check collectible collisions
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];
            if (this.isColliding(this.player, collectible)) {
                this.collectibles.splice(i, 1);
                this.score += 50;
                this.createParticles(collectible.x, collectible.y, '#ffff00');
                
                // Visual feedback for collection
                this.showCollectionEffect(collectible.x, collectible.y);
            }
        }
    }
    
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    playerHit() {
        this.lives--;
        this.aiData.errorCount++;
        this.createParticles(this.player.x, this.player.y, '#ff0000');
        
        // AI helps after multiple hits
        if (this.aiData.errorCount >= 3) {
            this.gameParams.speed = Math.max(1, this.gameParams.speed - 0.2);
            this.gameParams.obstacleFrequency = Math.max(0.005, this.gameParams.obstacleFrequency - 0.002);
            document.getElementById('aiReason').textContent = '🤖 AI ASSIST: Reducing difficulty after multiple hits!';
        }
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Brief invincibility and reset position
            this.player.x = 100;
            this.player.y = 400;
            
            // Show encouragement
            this.showAINotification('KEEP_GOING', `💪 ${this.lives} lives left! You got this!`);
        }
    }
    
    createParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1000,
                color: color
            });
        }
    }
    
    showCollectionEffect(x, y) {
        // Create floating "+50" text
        const scoreText = document.createElement('div');
        scoreText.textContent = '+50';
        scoreText.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            color: #ffff00;
            font-family: 'Orbitron', monospace;
            font-weight: bold;
            font-size: 20px;
            pointer-events: none;
            z-index: 1000;
            animation: floatUp 1s ease-out forwards;
        `;
        
        document.body.appendChild(scoreText);
        
        setTimeout(() => {
            if (scoreText.parentNode) {
                scoreText.remove();
            }
        }, 1000);
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('startBtn').textContent = 'START GAME';
        document.getElementById('pauseBtn').textContent = 'PAUSE';
        
        // Show AI panel ONLY after game over on mobile
        if (window.innerWidth <= 768) {
            document.querySelector('.ai-panel').style.display = 'block';
        }
        
        // Check for high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('aiArcadeHighScore', this.highScore);
            
            // Only show notification on desktop
            if (window.innerWidth > 768) {
                this.showAINotification('NEW_RECORD', '🏆 NEW HIGH SCORE! AI is impressed!');
            }
        }
        
        // AI final analysis
        const finalSurvival = this.aiData.survivalTime / 1000;
        const finalErrorRate = this.aiData.errorCount / (finalSurvival || 1);
        document.getElementById('aiReason').textContent = 
            `🎯 GAME OVER! Survived ${finalSurvival.toFixed(1)}s, Score: ${this.score}. AI made ${this.aiData.adaptationHistory.length} adaptations. ${this.score > this.highScore/2 ? 'Great job!' : 'Try again!'}`;
    }
    
  
  performAIAnalysis() {
        // Calculate metrics
        const avgReactionTime = this.calculateAverageReactionTime();
        const errorRate = this.aiData.errorCount / (this.aiData.survivalTime / 1000);
        const survivalSeconds = this.aiData.survivalTime / 1000;
        
        // AI Decision Engine - Rule-based adaptation
        let adaptation = null;
        let reason = '';
        
        // Rule 1: Player is doing too well - increase difficulty (much more lenient)
        if (survivalSeconds > 20 && errorRate < 0.1 && this.gameParams.speed < 3) {
            this.gameParams.speed += 0.2; // Smaller increase
            this.gameParams.obstacleFrequency += 0.002; // Smaller increase
            reason = `🚀 NICE WORK: Survived ${survivalSeconds.toFixed(1)}s! Adding slight challenge.`;
            adaptation = 'DIFFICULTY_UP';
        }
        // Rule 2: Player is struggling - help them more
        else if (errorRate > 0.3 && this.gameParams.speed > 1) {
            this.gameParams.speed -= 0.3; // Bigger help
            this.gameParams.obstacleFrequency -= 0.003; // Remove more obstacles
            reason = `🛡️ HELPING HAND: Making it easier so you can enjoy the game!`;
            adaptation = 'DIFFICULTY_DOWN';
        }
        // Rule 3: Less frequent gravity changes for variety (reduced range to prevent extreme jumps)
        else if (survivalSeconds > 15 && Math.random() < 0.3) {
            const gravityModes = [
                { value: 0.35, name: 'LIGHT GRAVITY', desc: '🌙 Light gravity! Slightly floatier jumps.' },
                { value: 0.6, name: 'HEAVY GRAVITY', desc: '⚡ Heavy gravity! Faster falling.' },
                { value: 0.4, name: 'NORMAL GRAVITY', desc: '🎯 Gravity normalized.' }
            ];
            const mode = gravityModes[Math.floor(Math.random() * gravityModes.length)];
            this.gameParams.gravity = mode.value;
            reason = mode.desc;
            adaptation = mode.name;
        }
        // Rule 4: Control sensitivity changes (less frequent)
        else if (Math.random() < 0.2) {
            const controlModes = [
                { value: 0.6, name: 'PRECISION MODE', desc: '🎯 Precision controls activated. Steady movements required.' },
                { value: 1.4, name: 'TURBO MODE', desc: '💨 Turbo controls! Lightning fast movement.' },
                { value: 0.8, name: 'SMOOTH MODE', desc: '🌊 Smooth sailing mode. Gentle control adjustments.' }
            ];
            const mode = controlModes[Math.floor(Math.random() * controlModes.length)];
            this.gameParams.controlSensitivity = mode.value;
            reason = mode.desc;
            adaptation = mode.name;
        }
        // Rule 5: Score-based progression (much higher thresholds)
        else if (this.score > this.level * 300) { // Need more points to level up
            this.level++;
            this.gameParams.speed += 0.1; // Smaller speed increase
            reason = `🏆 LEVEL ${this.level} UNLOCKED! Score: ${this.score}. Keep going!`;
            adaptation = 'LEVEL_UP';
        }
        // Rule 6: Random chaos mode for fun
        else if (survivalSeconds > 10 && Math.random() < 0.3) {
            const chaosModes = [
                { 
                    changes: { speed: 1.5, obstacleFrequency: 0.01, gravity: 0.3 },
                    desc: '🎪 CHAOS MODE: Random parameters! Expect the unexpected!'
                },
                {
                    changes: { speed: 3, obstacleFrequency: 0.03, controlSensitivity: 1.2 },
                    desc: '⚡ LIGHTNING MODE: Everything is faster! Can you keep up?'
                },
                {
                    changes: { speed: 1, obstacleFrequency: 0.005, gravity: 0.1 },
                    desc: '🧘 ZEN MODE: Slow and steady. Find your inner peace.'
                }
            ];
            const mode = chaosModes[Math.floor(Math.random() * chaosModes.length)];
            Object.assign(this.gameParams, mode.changes);
            reason = mode.desc;
            adaptation = 'CHAOS_MODE';
        }
        
        // Store adaptation history
        if (adaptation) {
            this.aiData.adaptationHistory.push({
                time: this.gameTime,
                adaptation: adaptation,
                reason: reason,
                params: { ...this.gameParams }
            });
            
            // Update UI with AI reasoning
            document.getElementById('aiReason').textContent = reason;
            
            // Visual notification of AI change
            this.showAINotification(adaptation, reason);
            
            // Call AI API for advanced analysis (optional enhancement)
            this.callAIAPI({
                survivalTime: survivalSeconds,
                errorRate: errorRate,
                score: this.score,
                currentParams: this.gameParams
            });
        } else {
            // Show current analysis even without changes
            document.getElementById('aiReason').textContent = 
                `📊 Monitoring: ${survivalSeconds.toFixed(1)}s survival, ${(errorRate*100).toFixed(1)}% errors, Score: ${this.score}`;
        }
        
        // Update AI stats display
        document.getElementById('adaptationCount').textContent = this.aiData.adaptationHistory.length;
        document.getElementById('analysisTimer').textContent = ((this.gameTime - this.aiData.lastAnalysis) / 1000).toFixed(1);
        
        // Update parameter bars
        this.updateParameterBars();
    }
    
    calculateAverageReactionTime() {
        // Simple heuristic based on movement patterns
        if (this.aiData.movementPatterns.length < 2) return 0;
        
        let totalReaction = 0;
        for (let i = 1; i < this.aiData.movementPatterns.length; i++) {
            const timeDiff = this.aiData.movementPatterns[i].time - 
                           this.aiData.movementPatterns[i - 1].time;
            totalReaction += timeDiff;
        }
        
        return totalReaction / this.aiData.movementPatterns.length;
    }
    
    async callAIAPI(data) {
        // This will call the serverless function for AI analysis
        try {
            const response = await fetch('/api/ai-analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const aiResponse = await response.json();
                console.log('AI Analysis:', aiResponse);
                // Could use AI suggestions to further refine parameters
            }
        } catch (error) {
            console.log('AI API not available, using local rule engine');
        }
    }
    
    showAINotification(adaptation, reason) {
        // Don't show notifications on mobile for cleaner experience
        if (window.innerWidth <= 768) return;
        
        // Create floating notification
        const notification = document.createElement('div');
        notification.className = 'ai-notification';
        notification.textContent = `AI: ${adaptation}`;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: rgba(0, 255, 0, 0.9);
            color: #000;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: 'Orbitron', monospace;
            font-weight: bold;
            z-index: 1000;
            animation: slideIn 0.5s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
        
        // Flash the AI panel
        const aiPanel = document.querySelector('.ai-panel');
        if (aiPanel.style.display !== 'none') {
            aiPanel.style.boxShadow = '0 0 30px rgba(0, 255, 0, 0.8)';
            setTimeout(() => {
                aiPanel.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.2)';
            }, 1000);
        }
    }
    
    updateParameterBars() {
        // Update visual parameter indicators with animation
        const speedPercent = Math.min((this.gameParams.speed / 5) * 100, 100);
        const obstaclePercent = Math.min((this.gameParams.obstacleFrequency / 0.05) * 100, 100);
        const gravityPercent = Math.min((this.gameParams.gravity / 1.5) * 100, 100);
        
        document.getElementById('speedBar').style.width = speedPercent + '%';
        document.getElementById('obstacleBar').style.width = obstaclePercent + '%';
        document.getElementById('gravityBar').style.width = gravityPercent + '%';
        
        // Color coding based on intensity
        const speedBar = document.getElementById('speedBar');
        const obstacleBar = document.getElementById('obstacleBar');
        const gravityBar = document.getElementById('gravityBar');
        
        speedBar.style.background = speedPercent > 70 ? 'linear-gradient(90deg, #ff0000, #ff6600)' : 
                                   speedPercent > 40 ? 'linear-gradient(90deg, #ffff00, #ff6600)' :
                                   'linear-gradient(90deg, #00ff00, #ffff00)';
        
        obstacleBar.style.background = obstaclePercent > 60 ? 'linear-gradient(90deg, #ff0000, #ff6600)' :
                                      'linear-gradient(90deg, #00ff00, #ff6600)';
        
        gravityBar.style.background = gravityPercent > 80 ? 'linear-gradient(90deg, #ff0000, #ff6600)' :
                                     gravityPercent < 30 ? 'linear-gradient(90deg, #00ffff, #0066ff)' :
                                     'linear-gradient(90deg, #00ff00, #ff6600)';
    }
    
    showAIDemo() {
        const demoMessages = [
            "🤖 AI DEMO: The AI continuously monitors your gameplay...",
            "📊 It tracks: Survival time, error rate, movement patterns, score",
            "⚡ AI adapts: Game speed, obstacle frequency, gravity, controls",
            "🎯 Example: If you survive 20+ seconds → AI increases speed",
            "🛡️ Example: If you keep dying → AI reduces difficulty",
            "🌙 Example: AI might activate moon gravity for variety",
            "💪 Example: After 3 hits → AI automatically helps you",
            "🏆 The AI creates a unique experience for every player!",
            "🎮 Start playing to see the AI adapt to YOUR skill level!"
        ];
        
        let index = 0;
        const showNext = () => {
            if (index < demoMessages.length) {
                document.getElementById('aiReason').textContent = demoMessages[index];
                this.showAINotification('AI_DEMO', `Step ${index + 1}/${demoMessages.length}`);
                index++;
                setTimeout(showNext, 2000);
            } else {
                document.getElementById('aiReason').textContent = '🎮 Ready to play! The AI will adapt to your gameplay in real-time.';
            }
        };
        showNext();
    }
    
    updateUI() {
        document.getElementById('score').textContent = `SCORE: ${this.score}`;
        document.getElementById('level').textContent = `LEVEL: ${this.level}`;
        document.getElementById('lives').textContent = `LIVES: ${this.lives}`;
        document.getElementById('highScore').textContent = `HIGH: ${this.highScore}`;
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw retro ground/platform
        this.drawGround();
        
        // Draw retro background
        this.drawBackground();
        
        // Draw jump height indicator (subtle guide line)
        if (this.gameState === 'playing') {
            const groundY = this.canvas.height - 50;
            const maxJumpY = groundY - 100; // Show max jump reach
            this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(0, maxJumpY);
            this.ctx.lineTo(this.canvas.width, maxJumpY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        // Draw particles
        for (const particle of this.particles) {
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.life / 1000;
            this.ctx.fillRect(particle.x, particle.y, 3, 3);
        }
        this.ctx.globalAlpha = 1;
        
        // Draw obstacles (retro enemies/hazards)
        for (const obstacle of this.obstacles) {
            this.drawObstacle(obstacle);
        }
        
        // Draw collectibles (coins/power-ups)
        for (const collectible of this.collectibles) {
            this.drawCollectible(collectible);
        }
        
        // Draw player character (Mario-style)
        this.drawPlayer();
        
        // Draw game state messages
        if (this.gameState === 'menu') {
            this.drawCenteredText('PRESS START TO BEGIN', this.canvas.height / 2);
        } else if (this.gameState === 'paused') {
            this.drawCenteredText('PAUSED', this.canvas.height / 2);
        } else if (this.gameState === 'gameOver') {
            this.drawCenteredText('GAME OVER', this.canvas.height / 2 - 30);
            this.drawCenteredText(`FINAL SCORE: ${this.score}`, this.canvas.height / 2 + 30);
        }
    }
    
    drawBackground() {
        // Gradient sky
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height - 50);
        gradient.addColorStop(0, '#001122');
        gradient.addColorStop(1, '#003344');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height - 50);
        
        // Stars in background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 50; i++) {
            const x = (i * 137) % this.canvas.width; // Pseudo-random positions
            const y = (i * 211) % (this.canvas.height - 100);
            const twinkle = Math.sin(this.gameTime / 200 + i) * 0.5 + 0.5;
            this.ctx.globalAlpha = twinkle;
            this.ctx.fillRect(x, y, 2, 2);
        }
        this.ctx.globalAlpha = 1;
        
        // Distant mountains/buildings
        this.ctx.fillStyle = 'rgba(0, 100, 100, 0.3)';
        for (let x = 0; x < this.canvas.width; x += 60) {
            const height = 80 + Math.sin(x / 100) * 30;
            this.ctx.fillRect(x, this.canvas.height - 50 - height, 50, height);
        }
        
        // Subtle grid overlay for retro feel
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.05)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    drawPlayer() {
        const x = this.player.x;
        const y = this.player.y;
        const w = this.player.width;
        const h = this.player.height;
        
        // Jump trail effect
        if (!this.player.onGround) {
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            this.ctx.fillRect(x + w/4, y + h, w/2, 3);
        }
        
        // Draw retro character (pixel art style)
        // Body (main color)
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
        
        // Head
        this.ctx.fillStyle = '#00ffff';
        this.ctx.fillRect(x + 6, y + 2, w - 12, 6);
        
        // Eyes
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x + 8, y + 4, 2, 2);
        this.ctx.fillRect(x + w - 10, y + 4, 2, 2);
        
        // Legs
        this.ctx.fillStyle = '#00cc00';
        this.ctx.fillRect(x + 6, y + h - 6, 3, 4);
        this.ctx.fillRect(x + w - 9, y + h - 6, 3, 4);
        
        // Arms (animated based on movement)
        if (Math.abs(this.player.vx) > 0.5) {
            const armOffset = Math.sin(this.gameTime / 100) * 2;
            this.ctx.fillRect(x + 2, y + 8 + armOffset, 3, 4);
            this.ctx.fillRect(x + w - 5, y + 8 - armOffset, 3, 4);
        } else {
            this.ctx.fillRect(x + 2, y + 8, 3, 4);
            this.ctx.fillRect(x + w - 5, y + 8, 3, 4);
        }
        
        // Outline for pixel art effect
        this.ctx.strokeStyle = this.player.onGround ? '#00ffff' : '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
        
        // Glow effect when jumping
        if (!this.player.onGround) {
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 10;
            this.ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
            this.ctx.shadowBlur = 0;
        }
    }
    
    drawCenteredText(text, y) {
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = 'bold 30px Orbitron';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, this.canvas.width / 2, y);
        
        // Glow effect
        this.ctx.shadowColor = '#00ff00';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText(text, this.canvas.width / 2, y);
        this.ctx.shadowBlur = 0;
    }
    
    drawObstacle(obstacle) {
        const x = obstacle.x;
        const y = obstacle.y;
        const w = obstacle.width;
        const h = obstacle.height;
        
        // Draw retro enemy/hazard
        // Main body (spiky enemy)
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
        
        // Spikes on top
        this.ctx.fillStyle = '#ff6600';
        for (let i = 0; i < w; i += 4) {
            this.ctx.fillRect(x + i, y, 3, 4);
        }
        
        // Eyes
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillRect(x + 6, y + 8, 3, 3);
        this.ctx.fillRect(x + w - 9, y + 8, 3, 3);
        
        // Evil pupils
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x + 7, y + 9, 1, 1);
        this.ctx.fillRect(x + w - 8, y + 9, 1, 1);
        
        // Animated mouth (opens/closes)
        if (Math.floor(this.gameTime / 300) % 2 === 0) {
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(x + w/2 - 2, y + h - 8, 4, 2);
        }
        
        // Outline
        this.ctx.strokeStyle = '#ff6600';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
        
        // Danger glow
        this.ctx.shadowColor = '#ff0000';
        this.ctx.shadowBlur = 5;
        this.ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
        this.ctx.shadowBlur = 0;
    }
    
    drawCollectible(collectible) {
        const x = collectible.x;
        const y = collectible.y;
        const w = collectible.width;
        const h = collectible.height;
        
        this.ctx.save();
        this.ctx.translate(x + w/2, y + h/2);
        this.ctx.rotate(collectible.rotation);
        
        // Draw spinning coin
        // Outer ring (gold)
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, w/2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner ring (darker gold)
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, w/2 - 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Center symbol (star or diamond)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            const px = Math.cos(angle) * 4;
            const py = Math.sin(angle) * 4;
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        this.ctx.fill();
        
        // Sparkle effect
        const sparkleTime = this.gameTime / 100;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(-1 + Math.sin(sparkleTime) * 2, -8, 2, 2);
        this.ctx.fillRect(8, -1 + Math.cos(sparkleTime) * 2, 2, 2);
        this.ctx.fillRect(-1 - Math.sin(sparkleTime) * 2, 8, 2, 2);
        this.ctx.fillRect(-8, -1 - Math.cos(sparkleTime) * 2, 2, 2);
        
        // Glow effect
        this.ctx.shadowColor = '#ffff00';
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, w/2, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
        
        this.ctx.restore();
    }
    
    drawGround() {
        const groundY = this.canvas.height - 50;
        
        // Main ground platform
        this.ctx.fillStyle = '#00aa00';
        this.ctx.fillRect(0, groundY, this.canvas.width, 50);
        
        // Grass texture on top
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(0, groundY, this.canvas.width, 8);
        
        // Grass blades
        for (let x = 0; x < this.canvas.width; x += 8) {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(x + 2, groundY - 2, 2, 4);
            this.ctx.fillRect(x + 5, groundY - 3, 2, 5);
        }
        
        // Underground blocks pattern
        for (let x = 0; x < this.canvas.width; x += 25) {
            for (let y = groundY + 10; y < this.canvas.height; y += 20) {
                this.ctx.strokeStyle = '#008800';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(x, y, 20, 15);
            }
        }
        
        // Ground outline
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, groundY);
        this.ctx.lineTo(this.canvas.width, groundY);
        this.ctx.stroke();
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.draw();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    console.log('🎮 Initializing AI Time-Travel Arcade...');
    const game = new AITimeArcade();
    console.log('✅ Game initialized successfully!');
    console.log('🎯 Click START GAME to begin playing');
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🎮 DOM loaded - Initializing game...');
        new AITimeArcade();
    });
} else {
    console.log('🎮 Page already loaded - Initializing game...');
    new AITimeArcade();
}