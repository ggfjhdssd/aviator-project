// Game state
let currentUser = null;
let gameInterval = null;
let currentMultiplier = 1.0;
let isGameActive = false;
let hasBetPlaced = false;
let currentBet = null;

// DOM Elements
const usernameSpan = document.getElementById('username');
const balanceSpan = document.getElementById('balance');
const logoutBtn = document.getElementById('logoutBtn');
const multiplierDiv = document.getElementById('multiplier');
const gameStatusDiv = document.getElementById('gameStatus');
const placeBetBtn = document.getElementById('placeBetBtn');
const cashoutBtn = document.getElementById('cashoutBtn');
const betAmountInput = document.getElementById('betAmount');
const autoCashoutInput = document.getElementById('autoCashout');
const previousMultipliersDiv = document.getElementById('previousMultipliers');

// Check authentication on page load
async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = '/login.html';
            return false;
        }
        
        currentUser = data.user;
        updateUserInfo();
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
        return false;
    }
}

// Update UI with user info
function updateUserInfo() {
    if (currentUser) {
        usernameSpan.textContent = currentUser.username;
        balanceSpan.textContent = currentUser.balance.toFixed(2);
    }
}

// Update balance
async function updateBalance(amount) {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/update-balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount }),
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser.balance = data.balance;
            balanceSpan.textContent = currentUser.balance.toFixed(2);
        }
    } catch (error) {
        console.error('Balance update failed:', error);
    }
}

// Logout function
async function logout() {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// Game functions
function startGame() {
    if (gameInterval) return;
    
    isGameActive = true;
    currentMultiplier = 1.0;
    
    gameInterval = setInterval(() => {
        // Random multiplier increase (0.01 to 0.1)
        const increase = Math.random() * 0.09 + 0.01;
        currentMultiplier = parseFloat((currentMultiplier + increase).toFixed(2));
        
        multiplierDiv.textContent = currentMultiplier.toFixed(2) + 'x';
        
        // Check for crash (random crash point between 1.1 and 10)
        const crashPoint = parseFloat((Math.random() * 8.9 + 1.1).toFixed(2));
        
        if (currentMultiplier >= crashPoint) {
            crash();
        }
        
        // Auto cashout check
        if (hasBetPlaced && currentMultiplier >= parseFloat(autoCashoutInput.value)) {
            cashout();
        }
    }, 100);
}

function crash() {
    stopGame();
    
    // Add to previous rounds
    addPreviousRound(currentMultiplier);
    
    // Update status
    gameStatusDiv.textContent = '💥 Crashed! Next round starting...';
    
    // Reset bet
    if (hasBetPlaced) {
        hasBetPlaced = false;
        placeBetBtn.disabled = false;
        cashoutBtn.disabled = true;
    }
    
    // Start new round after delay
    setTimeout(() => {
        if (isGameActive) {
            startGame();
            gameStatusDiv.textContent = 'Place your bets!';
        }
    }, 3000);
}

function stopGame() {
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
}

function addPreviousRound(multiplier) {
    const item = document.createElement('div');
    item.className = 'multiplier-item';
    
    if (multiplier >= 5) {
        item.classList.add('high');
    } else if (multiplier >= 2) {
        item.classList.add('medium');
    } else {
        item.classList.add('low');
    }
    
    item.textContent = multiplier.toFixed(2) + 'x';
    
    previousMultipliersDiv.insertBefore(item, previousMultipliersDiv.firstChild);
    
    // Keep only last 10
    while (previousMultipliersDiv.children.length > 10) {
        previousMultipliersDiv.removeChild(previousMultipliersDiv.lastChild);
    }
}

async function placeBet() {
    if (!currentUser) return;
    
    const betAmount = parseFloat(betAmountInput.value);
    
    if (betAmount > currentUser.balance) {
        alert('Insufficient balance!');
        return;
    }
    
    if (betAmount < 1) {
        alert('Minimum bet is $1');
        return;
    }
    
    hasBetPlaced = true;
    currentBet = betAmount;
    
    // Deduct from balance
    await updateBalance(-betAmount);
    
    // Update UI
    placeBetBtn.disabled = true;
    cashoutBtn.disabled = false;
    gameStatusDiv.textContent = 'Bet placed! Waiting for cashout...';
}

async function cashout() {
    if (!hasBetPlaced || !currentBet) return;
    
    const winnings = currentBet * currentMultiplier;
    
    // Add winnings to balance
    await updateBalance(winnings);
    
    // Reset bet state
    hasBetPlaced = false;
    currentBet = null;
    
    // Update UI
    cashoutBtn.disabled = true;
    placeBetBtn.disabled = false;
    gameStatusDiv.textContent = `Cashed out at ${currentMultiplier.toFixed(2)}x! Won $${winnings.toFixed(2)}`;
    
    // Add to history
    addPreviousRound(currentMultiplier);
}

// Initialize game
async function initGame() {
    const isAuthenticated = await checkAuth();
    
    if (isAuthenticated) {
        // Start game
        setTimeout(() => {
            startGame();
            gameStatusDiv.textContent = 'Game started! Place your bets...';
        }, 1000);
    }
    
    // Event listeners
    logoutBtn.addEventListener('click', logout);
    placeBetBtn.addEventListener('click', placeBet);
    cashoutBtn.addEventListener('click', cashout);
}

// Start everything when page loads
document.addEventListener('DOMContentLoaded', initGame);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (gameInterval) {
        clearInterval(gameInterval);
    }
});
