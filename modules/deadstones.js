const Board = require('./board')

function hasNLiberties(board, vertex, N, visited = [], count = 0, sign = null) {
    if (sign == null) sign = board.get(vertex)

    if (visited.some(v => v[0] == vertex[0] && v[1] == vertex[1]))
        return false

    let neighbors = board.getNeighbors(vertex)
    let freeNeighbors = []
    let friendlyNeighbors = []

    for (let i = 0; i < neighbors.length; i++) {
        let n = neighbors[i]
        let s = board.get(n)

        if (s == 0) freeNeighbors.push(n)
        else if (s == sign) friendlyNeighbors.push(n)
    }

    count += freeNeighbors.length
    if (count >= N) return true

    visited.push(vertex)

    return friendlyNeighbors.some(n => hasNLiberties(board, n, N, visited, count, sign))
}

function makeMove(board, sign, vertex) {
    let neighbors = board.getNeighbors(vertex)
    let neighborSigns = neighbors.map(n => board.get(n))

    if (neighborSigns.every(s => s == sign)) {
        return null
    }

    board.set(vertex, sign)

    if (!hasNLiberties(board, vertex, 2)) {
        board.set(vertex, 0)
        return null
    }

    let dead = []

    for (let i = 0; i < neighbors.length; i++) {
        let n = neighbors[i]
        if (neighborSigns[i] != -sign || hasNLiberties(board, n, 1))
            continue

        let chain = board.getChain(n)
        dead.push(...chain)
        chain.forEach(c => board.set(c, 0))
    }

    return dead
}

function fixHoles(board) {
    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            let vertex = [x, y]

            if (board.get(vertex) != 0)
                continue

            let neighbors = board.getNeighbors(vertex)
            let sign = board.get(neighbors[0])
            let fix = true

            for (let i = 1; i < neighbors.length; i++) {
                let n = neighbors[i]

                if (board.get(n) != sign) {
                    fix = false
                    break
                }
            }

            if (fix) board.set(vertex, sign)
        }
    }

    return board
}

exports.guess = function(board, ...args) {
    let map = exports.getProbabilityMap(board, ...args)
    let done = {}
    let result = []

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            let vertex = [x, y]
            let sign = board.get(vertex)

            if (sign == 0 || vertex in done) continue

            let chain = board.getChain(vertex)
            let probability = chain.map(v => map[v]).reduce((sum, x) => sum + x) / chain.length
            let newSign = probability < 0.5 ? -1 : probability > 0.5 ? 1 : 0

            if (newSign == -sign) result.push(...chain)

            done[vertex] = true
        }
    }

    return result
}

exports.playTillEnd = function(board, sign, iterations = null) {
    if (iterations == null) iterations = board.width * board.height
    board = board.clone()

    let freeVertices = []
    let illegalVertices = []

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            if (board.get([x, y]) != 0) continue
            freeVertices.push([x, y])
        }
    }

    let finished = {'-1': false, '1': false}

    while (iterations > 0) {
        if (freeVertices.length == 0 || finished[-sign] && finished[sign])
            break

        let madeMove = false

        while (freeVertices.length > 0) {
            let randomIndex = Math.floor(Math.random() * freeVertices.length)
            let vertex = freeVertices[randomIndex]
            let freedVertices = makeMove(board, sign, vertex, false)

            freeVertices.splice(randomIndex, 1)

            if (freedVertices != null) {
                freeVertices.push(...freedVertices)

                finished[-sign] = false
                madeMove = true

                break
            } else {
                illegalVertices.push(vertex)
            }
        }

        finished[sign] = !madeMove

        freeVertices.push(...illegalVertices)
        illegalVertices.length = 0

        sign = -sign
        iterations--
    }

    return fixHoles(board).arrangement
}

exports.getProbabilityMap = function(board, iterations = 30) {
    let pmap = []
    let nmap = []
    let result = {}

    for (let i = 0; i < iterations; i++) {
        let sign = Math.sign(Math.random() - 0.5)
        let areaMap = exports.playTillEnd(board, sign)

        for (let j = 0; j < areaMap.length; j++) {
            if (!(j in pmap)) pmap[j] = 0
            if (!(j in nmap)) nmap[j] = 0

            if (areaMap[j] < 0) nmap[j]++
            else if (areaMap[j] > 0) pmap[j]++
        }
    }

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            let v = [x, y]
            let j = board._vertex2index(v)

            if (pmap[j] + nmap[j] == 0) result[v] = 0.5
            else result[v] = pmap[j] / (pmap[j] + nmap[j])
        }
    }

    return result
}
