function permutations(arr) {
    if (!arr.length) return [[]];
    return arr.flatMap((x, i) =>
        permutations(arr.slice(0, i).concat(arr.slice(i + 1))).map(p => [x, ...p])
    );
}

function solveTSP(distanceMatrix) {
    const n = distanceMatrix.length;
    const nodes = Array.from({ length: n - 1 }, (_, i) => i + 1);
    let best = { order: null, dist: Infinity };

    permutations(nodes).forEach(order => {
        let dist = 0, current = 0;
        for (const next of order) {
            dist += distanceMatrix[current][next];
            current = next;
        }
        if (dist < best.dist) best = { order, dist };
    });

    return {
        order: best.order,
        bestDistance: best.dist
    };
}

module.exports = { solveTSP };