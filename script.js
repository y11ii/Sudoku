class SudokuGame {
    constructor() {
        this.grid = Array(9).fill().map(() => Array(9).fill(0));
        this.solution = Array(9).fill().map(() => Array(9).fill(0));
        this.initialGrid = Array(9).fill().map(() => Array(9).fill(0));
        this.selectedCell = null;
        this.selectedNumber = null;
        this.gameStartTime = null;
        this.gameTime = 0;
        this.timerInterval = null;
        this.isPaused = false;
        this.moveHistory = [];
        this.redoHistory = [];
        this.hintsUsed = 0;
        this.maxHints = 3;
        
        this.initializeGame();
        this.bindEvents();
        this.loadStats();
    }

    initializeGame() {
        this.createGrid();
        this.newGame();
    }

    createGrid() {
        const gridElement = document.getElementById('sudoku-grid');
        gridElement.innerHTML = '';
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.addEventListener('click', () => this.selectCell(row, col));
                gridElement.appendChild(cell);
            }
        }
    }

    bindEvents() {
        // 数字按钮事件
        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const number = parseInt(btn.dataset.number);
                this.selectNumber(number);
            });
        });

        // 游戏控制按钮
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('hint-btn').addEventListener('click', () => this.giveHint());
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());
        
        // 难度选择
        document.getElementById('difficulty').addEventListener('change', () => this.newGame());
        
        // 模态框按钮
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.hideVictoryModal();
            this.newGame();
        });
        document.getElementById('close-modal-btn').addEventListener('click', () => this.hideVictoryModal());
        
        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    newGame() {
        const difficulty = document.getElementById('difficulty').value;
        this.resetGame();
        this.generatePuzzle(difficulty);
        this.startTimer();
        this.updateDisplay();
    }

    resetGame() {
        this.grid = Array(9).fill().map(() => Array(9).fill(0));
        this.solution = Array(9).fill().map(() => Array(9).fill(0));
        this.initialGrid = Array(9).fill().map(() => Array(9).fill(0));
        this.selectedCell = null;
        this.selectedNumber = null;
        this.moveHistory = [];
        this.redoHistory = [];
        this.hintsUsed = 0;
        this.gameTime = 0;
        this.isPaused = false;
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    generatePuzzle(difficulty) {
        // 生成完整的数独解
        this.generateSolution();
        
        // 根据难度移除数字
        const cellsToRemove = this.getDifficultySettings(difficulty);
        this.removeCells(cellsToRemove);
        
        // 保存初始状态
        this.initialGrid = this.grid.map(row => [...row]);
    }

    generateSolution() {
        // 清空网格
        this.solution = Array(9).fill().map(() => Array(9).fill(0));
        
        // 使用回溯算法生成完整解
        this.solveSudoku(this.solution);
        this.grid = this.solution.map(row => [...row]);
    }

    solveSudoku(grid) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0) {
                    const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                    
                    for (let num of numbers) {
                        if (this.isValidMove(grid, row, col, num)) {
                            grid[row][col] = num;
                            
                            if (this.solveSudoku(grid)) {
                                return true;
                            }
                            
                            grid[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    getDifficultySettings(difficulty) {
        const settings = {
            easy: 35,
            medium: 45,
            hard: 55,
            expert: 60
        };
        return settings[difficulty] || 35;
    }

    removeCells(count) {
        const cells = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                cells.push([row, col]);
            }
        }
        
        const shuffledCells = this.shuffleArray(cells);
        
        for (let i = 0; i < count && i < shuffledCells.length; i++) {
            const [row, col] = shuffledCells[i];
            this.grid[row][col] = 0;
        }
    }

    selectCell(row, col) {
        if (this.isPaused) return;
        
        // 清除之前的选择
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('selected', 'highlight');
        });
        
        this.selectedCell = { row, col };
        
        // 高亮选中的单元格
        const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cellElement.classList.add('selected');
        
        // 高亮相同数字
        const currentValue = this.grid[row][col];
        if (currentValue !== 0) {
            this.highlightSameNumbers(currentValue);
        }
    }

    selectNumber(number) {
        if (this.isPaused) return;
        
        // 清除之前选中的数字按钮
        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 高亮选中的数字按钮
        const selectedBtn = document.querySelector(`[data-number="${number}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }
        
        this.selectedNumber = number;
        
        // 如果有选中的单元格，直接填入数字
        if (this.selectedCell) {
            this.makeMove(this.selectedCell.row, this.selectedCell.col, number);
        }
    }

    makeMove(row, col, number) {
        if (this.initialGrid[row][col] !== 0) return; // 不能修改初始数字
        
        const oldValue = this.grid[row][col];
        
        // 保存移动历史
        this.moveHistory.push({ row, col, oldValue, newValue: number });
        this.redoHistory = []; // 清空重做历史
        
        // 更新网格
        this.grid[row][col] = number;
        
        // 更新显示
        this.updateCellDisplay(row, col);
        
        // 检查错误
        this.checkErrors();
        
        // 检查是否完成
        if (this.isGameComplete()) {
            this.gameComplete();
        }
        
        // 更新按钮状态
        this.updateButtonStates();
    }

    isValidMove(grid, row, col, num) {
        // 检查行
        for (let c = 0; c < 9; c++) {
            if (grid[row][c] === num) return false;
        }
        
        // 检查列
        for (let r = 0; r < 9; r++) {
            if (grid[r][col] === num) return false;
        }
        
        // 检查3x3宫格
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        
        for (let r = boxRow; r < boxRow + 3; r++) {
            for (let c = boxCol; c < boxCol + 3; c++) {
                if (grid[r][c] === num) return false;
            }
        }
        
        return true;
    }

    checkErrors() {
        // 清除所有错误标记
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('error');
        });
        
        // 检查每个单元格
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const value = this.grid[row][col];
                if (value !== 0) {
                    // 临时清除当前值进行检查
                    this.grid[row][col] = 0;
                    if (!this.isValidMove(this.grid, row, col, value)) {
                        const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                        cellElement.classList.add('error');
                    }
                    this.grid[row][col] = value;
                }
            }
        }
    }

    highlightSameNumbers(number) {
        document.querySelectorAll('.cell').forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            if (this.grid[row][col] === number) {
                cell.classList.add('highlight');
            }
        });
    }

    updateDisplay() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                this.updateCellDisplay(row, col);
            }
        }
        this.updateButtonStates();
    }

    updateCellDisplay(row, col) {
        const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const value = this.grid[row][col];
        
        cellElement.textContent = value === 0 ? '' : value;
        
        // 设置单元格样式
        cellElement.classList.remove('given', 'filled');
        if (this.initialGrid[row][col] !== 0) {
            cellElement.classList.add('given');
        } else if (value !== 0) {
            cellElement.classList.add('filled');
        }
    }

    updateButtonStates() {
        document.getElementById('undo-btn').disabled = this.moveHistory.length === 0;
        document.getElementById('redo-btn').disabled = this.redoHistory.length === 0;
        document.getElementById('hint-btn').disabled = this.hintsUsed >= this.maxHints;
    }

    startTimer() {
        this.gameStartTime = Date.now();
        this.timerInterval = setInterval(() => {
            if (!this.isPaused) {
                this.gameTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
                this.updateTimerDisplay();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pause-btn');
        pauseBtn.textContent = this.isPaused ? '继续' : '暂停';
        
        if (this.isPaused) {
            document.querySelectorAll('.cell').forEach(cell => {
                cell.style.visibility = 'hidden';
            });
        } else {
            document.querySelectorAll('.cell').forEach(cell => {
                cell.style.visibility = 'visible';
            });
        }
    }

    giveHint() {
        if (this.hintsUsed >= this.maxHints || this.isPaused) return;
        
        // 找到一个空的单元格并填入正确答案
        const emptyCells = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }
        
        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const correctValue = this.solution[randomCell.row][randomCell.col];
            
            this.makeMove(randomCell.row, randomCell.col, correctValue);
            this.hintsUsed++;
        }
    }

    undo() {
        if (this.moveHistory.length === 0) return;
        
        const lastMove = this.moveHistory.pop();
        this.redoHistory.push(lastMove);
        
        this.grid[lastMove.row][lastMove.col] = lastMove.oldValue;
        this.updateCellDisplay(lastMove.row, lastMove.col);
        this.checkErrors();
        this.updateButtonStates();
    }

    redo() {
        if (this.redoHistory.length === 0) return;
        
        const move = this.redoHistory.pop();
        this.moveHistory.push(move);
        
        this.grid[move.row][move.col] = move.newValue;
        this.updateCellDisplay(move.row, move.col);
        this.checkErrors();
        this.updateButtonStates();
    }

    isGameComplete() {
        // 检查是否所有单元格都已填满
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col] === 0) return false;
            }
        }
        
        // 检查是否有错误
        const hasErrors = document.querySelectorAll('.cell.error').length > 0;
        return !hasErrors;
    }

    gameComplete() {
        clearInterval(this.timerInterval);
        
        // 更新统计
        this.updateStats();
        
        // 显示胜利模态框
        this.showVictoryModal();
        
        // 添加胜利动画
        document.querySelector('.sudoku-grid').classList.add('victory-animation');
    }

    showVictoryModal() {
        const modal = document.getElementById('victory-modal');
        const finalTime = document.getElementById('final-time');
        const finalDifficulty = document.getElementById('final-difficulty');
        
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        finalTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const difficultyText = {
            easy: '简单',
            medium: '中等',
            hard: '困难',
            expert: '专家'
        };
        finalDifficulty.textContent = difficultyText[document.getElementById('difficulty').value];
        
        modal.classList.remove('hidden');
    }

    hideVictoryModal() {
        document.getElementById('victory-modal').classList.add('hidden');
        document.querySelector('.sudoku-grid').classList.remove('victory-animation');
    }

    handleKeyPress(e) {
        if (this.isPaused) return;
        
        if (e.key >= '1' && e.key <= '9') {
            this.selectNumber(parseInt(e.key));
        } else if (e.key === '0' || e.key === 'Delete' || e.key === 'Backspace') {
            this.selectNumber(0);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
                   e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            this.handleArrowKeys(e.key);
        }
    }

    handleArrowKeys(key) {
        if (!this.selectedCell) return;
        
        let { row, col } = this.selectedCell;
        
        switch (key) {
            case 'ArrowUp':
                row = Math.max(0, row - 1);
                break;
            case 'ArrowDown':
                row = Math.min(8, row + 1);
                break;
            case 'ArrowLeft':
                col = Math.max(0, col - 1);
                break;
            case 'ArrowRight':
                col = Math.min(8, col + 1);
                break;
        }
        
        this.selectCell(row, col);
    }

    updateStats() {
        const stats = this.getStats();
        const difficulty = document.getElementById('difficulty').value;
        
        stats.completedGames++;
        stats[difficulty + 'Completed']++;
        
        if (!stats.bestTime || this.gameTime < stats.bestTime) {
            stats.bestTime = this.gameTime;
        }
        
        this.saveStats(stats);
        this.displayStats(stats);
    }

    getStats() {
        const defaultStats = {
            completedGames: 0,
            bestTime: null,
            easyCompleted: 0,
            mediumCompleted: 0,
            hardCompleted: 0,
            expertCompleted: 0
        };
        
        const saved = localStorage.getItem('sudokuStats');
        return saved ? { ...defaultStats, ...JSON.parse(saved) } : defaultStats;
    }

    saveStats(stats) {
        localStorage.setItem('sudokuStats', JSON.stringify(stats));
    }

    loadStats() {
        const stats = this.getStats();
        this.displayStats(stats);
    }

    displayStats(stats) {
        document.getElementById('completed-games').textContent = stats.completedGames;
        
        if (stats.bestTime) {
            const minutes = Math.floor(stats.bestTime / 60);
            const seconds = stats.bestTime % 60;
            document.getElementById('best-time').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // 计算准确率（简化版本）
        const accuracy = this.moveHistory.length > 0 ? 
            Math.max(0, 100 - (this.hintsUsed * 10)) : 100;
        document.getElementById('accuracy').textContent = accuracy + '%';
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    new SudokuGame();
});