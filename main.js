function newEmptyTiles() {
    return [
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
    ];
}

function newGameState() {
    const tiles = newEmptyTiles();
    const state = {
        nAction: 0,
        tiles,
        elements: [],
        elementId: 0,
        animations: [],
    };
    addRandomTile(state);
    addRandomTile(state);
    return state;
}

function addRandomTile(state) {
    let availablePositions = [];
    for (let x = 0; x < 4; x += 1) {
        for (let y = 0; y < 4; y += 1) {
            if (state.tiles[x][y] === null)
                availablePositions.push([x, y]);
        }
    }
    console.assert(availablePositions.length !== 0);
    let selected = Math.floor(Math.random() * availablePositions.length);
    let x = availablePositions[selected][0], y = availablePositions[selected][1];
    let n = Math.floor(Math.random() * 10) !== 0 ? 2 : 4;
    addTile(state, x, y, n);
    state.tiles[x][y] = n;
}

function newElementId(state, prefix) {
    state.elementId += 1;
    const id = prefix + state.elementId;
    state.elements.push(id);
    return id;
}

function addTile(state, x, y, n) {
    const addId = newElementId(state, 'add-tile-');
    state.animations.push({ operation: 'add', id: addId, x, y, n });
}

function moveTile(state, fromX, fromY, x, y, n) {
    const moveId = newElementId(state, 'move-tile-');
    state.animations.push({ operation: 'move', id: moveId, fromX, fromY, x, y, n });
}

function mergeTile(state, x, y, n) {
    const mergeId = newElementId(state, 'merge-tile-');
    state.animations.push({ operation: 'merge', id: mergeId, x, y, n });
}

function slide(state, direction) {
    const newState = {
        nAction: state.nAction + 1,
        tiles: newEmptyTiles(),
        elements: [],
        elementId: 0,
        animations: [],
    }

    function getX(x, y) {
        switch (direction) {
            case 'left': return x;
            case 'up': return y;
            case 'right': return 3 - x;
            case 'down': return 3 - y;
        }
    }

    function getY(x, y) {
        switch (direction) {
            case 'left': return y;
            case 'up': return x;
            case 'right': return 3 - y;
            case 'down': return 3 - x;
        }
    }

    let canSlide = false;
    function slideRow(y) {
        function getTile(state, x) {
            return state.tiles[getX(x, y)][getY(x, y)];
        }

        function copy(x) {
            newState.tiles[getX(x, y)][getY(x, y)] = state.tiles[getX(x, y)][getY(x, y)];
        }

        function move(fromX, x) {
            canSlide = true;
            moveTile(newState, getX(fromX, y), getY(fromX, y), getX(x, y), getY(x, y), getTile(state, fromX, y));
            newState.tiles[getX(x, y)][getY(x, y)] = state.tiles[getX(fromX, y)][getY(fromX, y)];
        }

        function merge(fromX, x) {
            canSlide = true;
            moveTile(newState, getX(fromX, y), getY(fromX, y), getX(x, y), getY(x, y), getTile(state, fromX, y));
            mergeTile(newState, getX(x, y), getY(x, y), getTile(state, fromX, y) + getTile(newState, x, y));
            newState.tiles[getX(x, y)][getY(x, y)] += state.tiles[getX(fromX, y)][getY(fromX, y)];
        }

        let merged = [false, false, false, false];
        for (let x = 0; x < 4; x += 1) {
            if (getTile(state, x) === null)
                continue;
            if (x === 0) {
                copy(x);
                continue;
            }
            let targetX;
            for (targetX = x - 1; targetX > 0 && getTile(newState, targetX) === null; targetX -= 1)
                ;
            if (getTile(newState, targetX) === null) {
                move(x, targetX);
            } else if (getTile(newState, targetX) === getTile(state, x) && !merged[targetX]) {
                merged[targetX] = true;
                merge(x, targetX);
            } else if (targetX + 1 !== x) {
                move(x, targetX + 1);
            } else {
                copy(x);
            }
        }
    }

    for (let y = 0; y < 4; y += 1)
        slideRow(y);
    if (!canSlide)
        return null;
    addRandomTile(newState);
    return newState;
}

const N_FRAME_ADD = 12;
const N_FRAME_MOVE = 12;
const N_FRAME_HALF_MERGE = 6;

function setSize(element, size) {
    element.style.width = element.style.height = element.style.lineHeight = size + 'px';
    element.style.fontSize = size / 2 + 'px';  // TODO smaller when inner text has many digits
}

function animationFrame(animation, i) {
    const element = document.querySelector('#' + animation.id);
    switch (animation.operation) {
        case 'add': {
            if (i == 0)
                element.style.display = '';
            if (i >= 0 && i < N_FRAME_ADD) {
                const progress = i / N_FRAME_ADD;
                setSize(element, progress * 100);
                element.style.left = 110 * animation.x + (1 - progress) * 100 / 2 + 'px';
                element.style.top = 110 * animation.y + (1 - progress) * 100 / 2 + 'px';
            }
            if (i == N_FRAME_ADD)
                element.style.display = 'none';
            return;
        }
        case 'move': {
            if (i == 0)
                element.style.display = '';
            if (i >= 0 && i < N_FRAME_MOVE) {
                setSize(element, 100);
                const progress = i / N_FRAME_MOVE;
                element.style.left = animation.fromX * 110 + progress * (animation.x * 110 - animation.fromX * 110) + 'px';
                element.style.top = animation.fromY * 110 + progress * (animation.y * 110 - animation.fromY * 110) + 'px';
            }
            if (i == N_FRAME_MOVE)
                element.style.display = 'none';
            return;
        }
        case 'merge': {
            if (i == 0)
                element.style.display = '';
            if (i >= 0 && i < N_FRAME_HALF_MERGE) {
                const progress = i / N_FRAME_HALF_MERGE;
                setSize(element, 100 + progress * 10);
                element.style.left = 110 * animation.x - progress * 10 / 2 + 'px';
                element.style.top = 110 * animation.y - progress * 10 / 2 + 'px';
            }
            if (i >= N_FRAME_HALF_MERGE && i < N_FRAME_HALF_MERGE * 2) {
                const progress = (i - N_FRAME_HALF_MERGE) / N_FRAME_HALF_MERGE;
                setSize(element, 100 + (1 - progress) * 10);
                element.style.left = 110 * animation.x - (1 - progress) * 10 / 2 + 'px';
                element.style.top = 110 * animation.y - (1 - progress) * 10 / 2 + 'px';
            }
            if (i == N_FRAME_HALF_MERGE * 2)
                element.style.display = 'none';
            return;
        }
    }
    //
    return;
}

function stateAnimationStart(state) {
    for (let x = 0; x < 4; x += 1) {
        for (let y = 0; y < 4; y += 1) {
            if (state.tiles[x][y] === null)
                continue;
            const element = document.createElement('div');
            element.id = 'tile-' + x + '-' + y;
            element.classList.add('state-tile');
            setSize(element, 100);
            element.style.textAlign = 'center';
            element.style.position = 'absolute';
            element.style.left = 110 * x + 'px';
            element.style.top = 110 * y + 'px';
            element.style.borderStyle = 'solid';
            element.style.opacity = 0.25;
            element.innerText = state.tiles[x][y];
            document.body.appendChild(element);
        }
    }
    for (let animation of state.animations) {
        const element = document.createElement('div');
        element.id = animation.id;
        element.classList.add('state-tile');
        element.style.textAlign = 'center';
        element.style.position = 'absolute';
        element.style.borderStyle = 'solid';
        element.style.display = 'none';
        element.innerText = animation.n;
        document.body.appendChild(element);
    }
}

function tileAnimationDone(position) {
    document.querySelector('#tile-' + position[0] + '-' + position[1]).style.opacity = 1.0;
}

function stateFrame(state) {
    const animations = { add: [], move: [], merge: [] };
    for (let animation of state.animations)
        animations[animation.operation].push(animation);

    const animatedTiles = newEmptyTiles();
    for (let animation of animations.move)
        animatedTiles[animation.x][animation.y] = 'move';
    for (let animation of animations.merge)
        animatedTiles[animation.x][animation.y] = 'merge';
    for (let animation of animations.add)
        animatedTiles[animation.x][animation.y] = 'add';
    const tileStatus = { still: [], move: [], merge: [], add: [] };
    for (let x = 0; x < 4; x += 1) {
        for (let y = 0; y < 4; y += 1) {
            if (state.tiles[x][y] !== null)
                tileStatus[animatedTiles[x][y] || 'still'].push([x, y]);
        }
    }

    return function (i) {
        if (i == 0) {
            for (let position of tileStatus.still)
                tileAnimationDone(position);
        }
        if (animations.move.length !== 0) {
            for (let animation of animations.move)
                animationFrame(animation, i);
            i -= N_FRAME_MOVE;
        }
        if (i == 0) {
            for (let position of tileStatus.move)
                tileAnimationDone(position);
        }
        if (animations.merge.length !== 0) {
            for (let animation of animations.merge)
                animationFrame(animation, i);
            i -= N_FRAME_HALF_MERGE * 2;
        }
        if (i == 0) {
            for (let position of tileStatus.merge)
                tileAnimationDone(position);
        }
        if (animations.add.length !== 0) {
            for (let animation of animations.add)
                animationFrame(animation, i);
            i -= N_FRAME_ADD;
        }
        if (i == 0) {
            for (let position of tileStatus.add)
                tileAnimationDone(position);
        }
        return i == 0;
    }
}

function clearState() {
    for (let element of document.querySelectorAll('.state-tile'))
        element.remove();
}

function appAnimation(state) {
    stateAnimationStart(state.game);
    const frame = stateFrame(state.game);
    let i = 0;
    function onFrame() {
        state.animationId = null;
        const done = frame(i);
        if (!done) {
            i += 1;
            state.animationId = requestAnimationFrame(onFrame);
        }
    }
    onFrame();
}

function newAppState() {
    return {
        game: newGameState(),
        animationId: null,
    };
}

function start() {
    const state = newAppState();
    appAnimation(state);
    const newGameStates = {};
    for (let direction of ['left', 'up', 'right', 'down'])
        newGameStates[direction] = slide(state.game, direction);

    document.addEventListener('keydown', function onKey(e) {
        let direction;
        switch (e.code) {
            case 'KeyA':
                direction = 'left';
                break;
            case 'KeyW':
                direction = 'up';
                break;
            case 'KeyD':
                direction = 'right';
                break;
            case 'KeyS':
                direction = 'down';
                break;
            default:
                return;
        }
        const newGame = newGameStates[direction];
        if (newGame === null)
            return;
        if (state.animationId !== null) {
            cancelAnimationFrame(state.animationId);
            state.animationId = null;
        }
        clearState();
        state.game = newGame;
        appAnimation(state);

        let canSlide = false;
        for (let direction of ['left', 'up', 'right', 'down']) {
            newGameStates[direction] = slide(state.game, direction);
            if (newGameStates[direction] !== null)
                canSlide = true;
        }
        if (!canSlide) {
            console.log('Game over');
            document.removeEventListener('keydown', onKey);
        }
    });
}

window.addEventListener('load', start);
