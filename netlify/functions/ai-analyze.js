exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const gameData = JSON.parse(event.body);
        
        // Extract game metrics
        const { survivalTime, errorRate, score, currentParams } = gameData;
        
        // AI Analysis Logic (rule-based system for demo)
        let aiSuggestions = [];
        let adaptationReason = '';
        
        // Performance analysis
        if (survivalTime > 20 && errorRate < 0.2) {
            aiSuggestions.push({
                parameter: 'speed',
                adjustment: 'increase',
                value: Math.min(currentParams.speed + 0.5, 6),
                confidence: 0.85
            });
            adaptationReason = 'Player demonstrates high skill level. Increasing challenge to maintain engagement.';
        } else if (errorRate > 0.6) {
            aiSuggestions.push({
                parameter: 'speed',
                adjustment: 'decrease',
                value: Math.max(currentParams.speed - 0.3, 1),
                confidence: 0.9
            });
            adaptationReason = 'High error rate detected. Reducing difficulty to improve player experience.';
        }
        
        // Adaptive difficulty suggestions
        if (score > 500 && currentParams.obstacleFrequency < 0.04) {
            aiSuggestions.push({
                parameter: 'obstacleFrequency',
                adjustment: 'increase',
                value: currentParams.obstacleFrequency + 0.005,
                confidence: 0.75
            });
        }
        
        // Gravity variations for advanced players
        if (survivalTime > 15 && Math.random() < 0.3) {
            const gravityVariations = [0.3, 0.7, 1.2];
            const newGravity = gravityVariations[Math.floor(Math.random() * gravityVariations.length)];
            aiSuggestions.push({
                parameter: 'gravity',
                adjustment: 'modify',
                value: newGravity,
                confidence: 0.6
            });
        }
        
        // If we had Azure OpenAI API key, we could make a real AI call here:
        /*
        const aiResponse = await callAzureOpenAI({
            prompt: `Analyze this game session data and suggest parameter adjustments:
                     Survival Time: ${survivalTime}s
                     Error Rate: ${errorRate}
                     Score: ${score}
                     Current Speed: ${currentParams.speed}
                     Current Obstacle Frequency: ${currentParams.obstacleFrequency}
                     
                     Provide specific parameter adjustments to optimize player engagement.`,
            maxTokens: 150
        });
        */
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                analysis: {
                    playerSkillLevel: errorRate < 0.3 ? 'advanced' : errorRate < 0.6 ? 'intermediate' : 'beginner',
                    engagementScore: Math.max(0, Math.min(100, (survivalTime * 2) - (errorRate * 50))),
                    suggestions: aiSuggestions,
                    reasoning: adaptationReason,
                    timestamp: new Date().toISOString()
                }
            })
        };
        
    } catch (error) {
        console.error('AI Analysis Error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'AI analysis failed',
                fallback: 'Using local rule engine'
            })
        };
    }
};

// Placeholder for Azure OpenAI integration
async function callAzureOpenAI(params) {
    // This would integrate with Azure OpenAI API
    // const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    // const apiKey = process.env.AZURE_OPENAI_API_KEY;
    
    // For now, return mock response
    return {
        choices: [{
            message: {
                content: "Increase speed by 0.5 and obstacle frequency by 0.005 based on player performance."
            }
        }]
    };
}