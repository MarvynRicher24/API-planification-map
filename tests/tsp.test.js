// tests/tsp.test.js
const { solveTSP } = require('../src/utils/tsp');

describe('solveTSP()', () => {
    it('trouve l’ordre minimal sur 3 points', () => {
        const dist = [
            [0, 5, 10],
            [5, 0, 3],
            [10, 3, 0]
        ];
        const { order, bestDistance } = solveTSP(dist);
        expect(bestDistance).toBe(8);
        expect(order).toEqual([1, 2]);
    });

    it('gère un seul point à visiter', () => {
        const dist = [
            [0, 7],
            [7, 0]
        ];
        const { order, bestDistance } = solveTSP(dist);
        expect(bestDistance).toBe(7);
        expect(order).toEqual([1]);
    });
});
