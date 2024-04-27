$(() => {
    const State = {
        Brank: 0, //brank cell
        None: 1, //white dice
        Tip: 2, // yellow dice
        Success: 3 // green dice
    }
    function arrayEquals(a, b) {
        return Array.isArray(a) &&
            Array.isArray(b) &&
            a.length === b.length &&
            a.every((val, index) => val === b[index]);
    }
    const diceCombination = function (dices, sum, diceMustSmallerThan = 6) {
        if (sum / dices > 6) return [[]];
        if (dices == 1) {
            return [[sum]];
        }
        const res = [];
        const values = [1, 2, 3, 4, 5, 6].filter(p => p >= sum / dices && p <= diceMustSmallerThan);
        for (var v of values) {
            if (sum - v < 1) continue;
            diceCombination(dices - 1, sum - v, v).forEach(ar => {
                res.push([...ar, v]);
            })
        }
        return res;
    }
    class Cell {
        static DiceFaces = Array.from(Array(6), (v, k) => k + 1);
        availables = [];
        current = null;
        status = State.Brank;
        $element = null;
        board = {};
        constructor(current, state, $element, board) {
            this.$element = $element;
            this.board = board;
            this.current = current;
            this.status = state;
            if (state === State.Success) {
                this.availables = [this.current];
            } else if (state === State.Break) {
                this.availables = [];
            } else {
                this.availables = Cell.DiceFaces.filter(p=>p!=this.current);
            }
        }
        toString() {
            const indicators = [" ", "-", "*", "#"];
            return indicators[this.status];
        }
        horizontals() {
            return this.board.row(this.board.rowOf(this)).filter(cell => cell != this);
        }
        verticals() {
            return this.board.col(this.board.colOf(this)).filter(cell => cell != this);
        }
        removeCandidate(value) {
            this.availables = this.availables.filter(p => p != value);
        }
    }
    class Board {
        height;
        width;
        board = [];
        constructor(height, width) {
            this.height = height;
            this.width = width;
        }
        addCell(value, state,$element) {
            this.board.push(new Cell(value, state,$element,this));
        }
        getCell(row, col) {
            var index = row * width + col;
            return this.board[index];
        }
        indexOf(cell) {
            return this.board.indexOf(cell);
        }
        rowOf(cell) {
            const index = this.indexOf(cell);
            return Math.trunc(index / this.width);
        }
        colOf(cell) {
            const index = this.indexOf(cell);
            return index % this.width;
        }
        row(index) {
            const start = index * this.width;
            const end = start + this.width ;
            return this.board.slice(start, end)
                .filter(cell => cell.status != State.Brank);
        }
        col(index) {
            return Array.from(Array(this.height), (v, k) => (k * this.width) + index)
                .filter(p => this.board[p].status != State.Brank)
                .map(p => this.board[p]);
        }
        cells() {
            return this.board.filter(p => true);
        }
        toString() {
            var s = "";
            for (let i = 0; i < this.height; i++){
                s += this.row(i).map(cell => cell.toString()) + "\n";
            }
            return s;
        }
    }

    class DiceleHint {
        $board = null;
        vhints = [];
        hhints = [];
        boardImpl = {};
        observer = {};
        stopObserve = false;
        constructor($board) {
            this.$board = $board;
            this.revalidate(true);
            for (var cell of this.$board.find(".dice")) {
                const $cell = $(cell);
                let value = parseInt($cell.attr("data-value"));
                var state = State.Brank;
                if (value === 6) {
                    value = 0;
                    state = State.Brank;
                } else {
                    value += 1;
                    switch ($cell.attr("data-state")) {
                        case "none": state = State.None; break;
                        case "warning": state = State.Tip; break;
                        case "success": state = State.Success; break;
                    }
                }
                this.boardImpl.addCell(value, state,$cell);
            }
            this.observer = new MutationObserver((mutationList, observer) => {
                setTimeout(() => {
                    let vsum = this.$board.siblings(".game-sum-container-vertical").find(".sum").toArray().map(elem => parseInt($(elem).html()));
                    const isBoardChange = !arrayEquals(vsum, this.vhints);
                    this.revalidate(isBoardChange);
                }, 100);
            });
            this.observer.observe(this.$board[0], { attributes: false, childList: true, subtree: false });
            this.observer.observe(this.$board.siblings(".game-sum-container-vertical")[0], { attributes: false, childList: true, subtree: true })
        }
        clearHint() {
            this.$board.parent().find(".hint").remove();
        }
        showHint() {
            this.clearHint();
            this.boardImpl.cells().filter(cell=>cell.status!==State.Brank).forEach((cell, index) => {
                $("<div />").addClass("hint").html(cell.availables.join(" ")).appendTo(cell.$element);  
            });
        }
        revalidate(isRenew) {
            if (this.stopObserve === true) return;
            this.stopObserve = true;
            try {
                if (isRenew) {
                    this.vhints = this.$board.siblings(".game-sum-container-vertical").find(".sum").toArray().map(elem => parseInt($(elem).html()));
                    this.hhints = this.$board.siblings(".game-sum-container-horizontal").find(".sum").toArray().map(elem => parseInt($(elem).html()))
                    this.boardImpl = new Board(this.vhints.length, this.hhints.length);
                }

                this.$board.find(".dice").map((index, cell) => {
                    const $cell = $(cell);
                    let value = parseInt($cell.attr("data-value"));
                    var state = State.Brank;
                    if (value === 6) {
                        value = 0;
                        state = State.Brank;
                    } else {
                        value += 1;
                        switch ($cell.attr("data-state")) {
                            case "none": state = State.None; break;
                            case "warning": state = State.Tip; break;
                            case "success": state = State.Success; break;
                        }
                    }
                    if (isRenew) {
                        this.boardImpl.addCell(value, state, $cell);
                    } else {
                        let c = this.boardImpl.board[index];
                        c.current = value;
                        if (c.status != state && state==State.Success) {
                            c.availables = [value];
                        }
                        c.status = state;
                        c.$element = $cell;
                        c.removeCandidate(value);
                    }
                });
                this.filterCandidate();
            } finally {
                this.stopObserve = false;
            }
        }
        filterCandidate() {
            //白ダイスから縦横の候補を消し込む
            this.boardImpl.cells().filter(cell => cell.status == State.None).forEach(cell => {
                cell.horizontals().forEach(c1 => c1.removeCandidate(cell.current));
                cell.verticals().forEach(c1 => c1.removeCandidate(cell.current));
            });
            //各行のダイスSumから組み合わせを取り出す
            this.vhints.forEach((value, index) => {
                const rowCells = this.boardImpl.row(index);
                let sumRest = rowCells.filter(cell => cell.status == State.Success).reduce((p, c) => p + c.current,0);
                const movableCells = rowCells.filter(cell => cell.status == State.None || cell.status == State.Tip);
                const patterns = diceCombination(movableCells.length, value - sumRest);
                const dicepattern = [...new Set(patterns.flat())];
                if (dicepattern.length < 6) {
                    Cell.DiceFaces.filter(d => !dicepattern.includes(d)).forEach(p => movableCells.forEach(cell => cell.removeCandidate(p)));
                }
            });
            this.hhints.forEach((value, index) => {
                const colCells = this.boardImpl.col(index);
                let sumRest = colCells.filter(cell => cell.status == State.Success).reduce((p, c) => p + c.current,0);
                const movableCells = colCells.filter(cell => cell.status == State.None || cell.status == State.Tip);
                const patterns = diceCombination(movableCells.length, value - sumRest);
                const dicepattern = [...new Set(patterns.flat())];
                if (dicepattern.length < 6) {
                    Cell.DiceFaces.filter(d => !dicepattern.includes(d)).forEach(p => movableCells.forEach(cell => cell.removeCandidate(p)));
                }
            });
            this.showHint();
        }
        toString() {
            return this.boardImpl.toString();
        }

    }
    const hint = new DiceleHint($("#board"));
    hint.filterCandidate();
});