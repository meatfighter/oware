export enum Player {
    A = 1,
    B = -1,
}

export enum NodeType {
    INTERMEDIATE = 0,
    DRAW = 1,
    A_WON = 2,
    B_WON = 3,
}

export enum CreateOperation {
    RESET,
    SOWED,
    CAPTURED_REMAINDER,
}

export class TreeNode {

    private static readonly PERMUTATIONS: number[][] = []; // All 720 orderings of six houses.

    static {
        (function permute(array: number[] = [], index: number = 0, used: boolean[] = new Array(6).fill(false)) {
            if (index === 6) {
                TreeNode.PERMUTATIONS.push(array.slice());
            } else {
                for (let i = 0; i < 6; ++i) {
                    if (used[i]) {
                        continue;
                    }
                    used[i] = true;
                    array[index] = i;
                    permute(array, index + 1, used);
                    used[i] = false;
                }
            }
        })();
    }

    parent: TreeNode | null;
    houses: number[];
    scoreA: number;
    scoreB: number;

    hash: number;
    type: NodeType;
    heuristicValue: number;

    createPlayer: Player;             // Player who did the operation that created this node.
    createOperation: CreateOperation; // The operation done to create this node.
    createSownHouse: number;          // If this node was created by sowing, this is the house that was sown.
    createCaptured: boolean;          // Indicates if seeds were captured while creating this node.

    constructor(node: TreeNode | null = null) {
        if (node === null) {
            this.parent = null;
            this.houses = new Array(12).fill(4);
            this.scoreA = 0;
            this.scoreB = 0;

            this.hash = 0;
            this.type = NodeType.INTERMEDIATE;
            this.heuristicValue = 0;

            this.createPlayer = Player.B; // Player A makes the first move, unless this is reassigned.
            this.createOperation = CreateOperation.RESET;
            this.createSownHouse = -1;
            this.createCaptured = false;
        } else {
            this.parent = node;
            this.houses = node.houses.slice();
            this.scoreA = node.scoreA;
            this.scoreB = node.scoreB;

            this.hash = node.hash;
            this.type = node.type;
            this.heuristicValue = node.heuristicValue;

            this.createPlayer = node.createPlayer;
            this.createOperation = node.createOperation;
            this.createSownHouse = node.createSownHouse;
            this.createCaptured = node.createCaptured;
        }
    }

    children(): TreeNode[] {

        if (this.type !== NodeType.INTERMEDIATE) {
            return [];
        }

        const houseOffset = (this.createPlayer === Player.B) ? 0 : 6;
        const nodes: TreeNode[] = [];

        const permutation = TreeNode.PERMUTATIONS[Math.floor(Math.random() * TreeNode.PERMUTATIONS.length)];

        for (let i = 5; i >= 0; --i) {
            const node = this.attemptSow(houseOffset + permutation[i]);
            if (node !== null) {
                nodes.push(node);
            }
        }
        if (nodes.length === 0) {
            const node = new TreeNode(this);
            node.createPlayer = -this.createPlayer;
            node.createOperation = CreateOperation.CAPTURED_REMAINDER;
            node.createSownHouse = -1;
            node.createCaptured = false;
            for (let i = 11; i >= 6; --i) {
                node.scoreB += node.houses[i];
                node.houses[i] = 0;
            }
            for (let i = 5; i >= 0; --i) {
                node.scoreA += node.houses[i];
                node.houses[i] = 0;
            }
            node.determineHashTypeAndHeuristicValue();
            nodes.push(node);
        } else {
            if (this.createPlayer === Player.A) {
                nodes.sort((a, b) => a.heuristicValue - b.heuristicValue);
            } else {
                nodes.sort((a, b) => b.heuristicValue - a.heuristicValue);
            }
        }

        return nodes;
    }

    private attemptSow(house: number): TreeNode | null {

        if (this.houses[house] === 0) {
            return null; // empty house
        }

        // Create child, which may be invalid.
        const node = new TreeNode(this);
        node.createPlayer = -this.createPlayer;
        node.createOperation = CreateOperation.SOWED;
        node.createSownHouse = house;
        node.createCaptured = false;

        // Sow
        let seeds = node.houses[house];
        node.houses[house] = 0;
        let h = house;
        while (seeds > 0) {
            if (++h > 11) {
                h = 0;
            }
            if (h === house && ++h > 11) {
                h = 0;
            }
            --seeds
            ++node.houses[h];
        }

        if (node.createPlayer === Player.A) {
            if (h >= 6) {
                while (h >= 6) {
                    if (node.houses[h] === 2 || node.houses[h] === 3) {
                        node.houses[h] = -node.houses[h]; // Mark captured houses by negating them.
                        --h;
                    } else {
                        break;
                    }
                }
                let emptyHouses = 0;
                for (let i = 11; i >= 6; --i) {
                    if (node.houses[i] <= 0) {
                        ++emptyHouses;
                    }
                }
                if (emptyHouses === 6) {
                    for (let i = 11; i >= 6; --i) { // Player cannot capture all opponent's seeds.
                        if (node.houses[i] < 0) {
                            node.houses[i] = -node.houses[i];
                        }
                    }
                } else {
                    for (let i = 11; i >= 6; --i) {
                        if (node.houses[i] < 0) {
                            node.scoreA -= node.houses[i]; // Capture seeds.
                            node.houses[i] = 0;
                            node.createCaptured = true;
                        }
                    }
                }
            }
            for (let i = 11; i >= 6; --i) { // Verify opponent can make the next move.
                if (node.houses[i] !== 0) {
                    node.determineHashTypeAndHeuristicValue();
                    node.checkThreefoldRepetition();
                    return node;
                }
            }
        } else {
            if (h < 6) {
                while (h >= 0) {
                    if (node.houses[h] === 2 || node.houses[h] === 3) {
                        node.houses[h] = -node.houses[h]; // Mark captured houses by negating them.
                        --h;
                    } else {
                        break;
                    }
                }
                let emptyHouses = 0;
                for (let i = 5; i >= 0; --i) {
                    if (node.houses[i] <= 0) {
                        ++emptyHouses;
                    }
                }
                if (emptyHouses === 6) {
                    for (let i = 5; i >= 0; --i) { // Player cannot capture all opponent's seeds.
                        if (node.houses[i] < 0) {
                            node.houses[i] = -node.houses[i];
                        }
                    }
                } else {
                    for (let i = 5; i >= 0; --i) {
                        if (node.houses[i] < 0) {
                            node.scoreB -= node.houses[i]; // Capture seeds.
                            node.houses[i] = 0;
                            node.createCaptured = true;
                        }
                    }
                }
            }
            for (let i = 5; i >= 0; --i) {
                if (node.houses[i] !== 0) { // Verify opponent can make the next move.
                    node.determineHashTypeAndHeuristicValue();
                    node.checkThreefoldRepetition();
                    return node;
                }
            }
        }

        return null; // The move would leave the opponent with no seeds, which is illegal.
    }

    private checkThreefoldRepetition() {
        outer: {
            for (let i = 11; i >= 6; --i) {
                if (this.houses[i] > 0) {
                    break outer;
                }
            }
            return; // The threefold repetition rule only applies when both players have seeds in their houses.
        }

        outer: {
            for (let i = 5; i >= 0; --i) {
                if (this.houses[i] > 0) {
                    break outer;
                }
            }
            return; // The threefold repetition rule only applies when both players have seeds in their houses.
        }

        // The threefold repetition rule only applies to positions created by the player who created this position.
        let ancestor = this.parent;
        let repeats = 0;
        while (ancestor !== null && ancestor.scoreA === this.scoreA && ancestor.scoreB === this.scoreB) {
            outer: if (ancestor.createPlayer === this.createPlayer && ancestor.hash === this.hash) {
                for (let i = 11; i >= 0; --i) {
                   if (ancestor.houses[i] !== this.houses[i]) {
                       break outer;
                   }
                }
                if (++repeats === 3) {
                    this.createOperation = CreateOperation.CAPTURED_REMAINDER;
                    for (let i = 11; i >= 6; --i) {
                        this.scoreB += this.houses[i];
                    }
                    for (let i = 5; i >= 0; --i) {
                        this.scoreA += this.houses[i];
                    }
                    this.determineHashTypeAndHeuristicValue();
                    return;
                }
            }
            ancestor = ancestor.parent;
        }
    }

    private determineHashTypeAndHeuristicValue() {

        const h0 = (this.scoreA << 24) | (this.houses[3] << 18) | (this.houses[2] << 12) | (this.houses[1] << 6)
            | this.houses[0];
        const h1 = (this.scoreB << 25) | (this.houses[7] << 19) | (this.houses[6] << 13) | (this.houses[5] << 7)
            | (this.houses[4] << 1);
        const h2 = (this.houses[11] << 21) | (this.houses[10] << 15) | (this.houses[9] << 9) | (this.houses[8] << 3);
        this.hash = h0 ^ h1 ^ h2;

        // Score difference
        this.heuristicValue = 200 * (this.scoreA - this.scoreB);

        // Type and win bonus
        if (this.scoreA === 24 && this.scoreB === 24) {
            this.type = NodeType.DRAW;
        } else if (this.scoreA > 24) {
            this.type = NodeType.A_WON;
            this.heuristicValue += 10_000;
        } else if (this.scoreB > 24) {
            this.type = NodeType.B_WON;
            this.heuristicValue -= 10_000;
        } else {
            this.type = NodeType.INTERMEDIATE;
        }

        // Isolated houses with capture potential
        for (let i = 11; i >= 6; --i) {
            switch (this.houses[i]) {
                case 0:
                    this.heuristicValue += 10;
                    break;
                case 1:
                    this.heuristicValue += 20;
                    break;
                case 2:
                    this.heuristicValue += 30;
                    break;
            }
        }
        for (let i = 5; i >= 0; --i) {
            switch (this.houses[i]) {
                case 0:
                    this.heuristicValue -= 10;
                    break;
                case 1:
                    this.heuristicValue -= 20;
                    break;
                case 2:
                    this.heuristicValue -= 30;
                    break;
            }
        }

        // Adjacent houses with capture potential
        for (let i = 10; i >= 6; --i) {
            if (this.houses[i] <= 2 && this.houses[i + 1] <= 2) {
                ++this.heuristicValue;
            }
        }
        for (let i = 4; i >= 0; --i) {
            if (this.houses[i] <= 2 && this.houses[i + 1] <= 2) {
                --this.heuristicValue;
            }
        }
    }

    private pad(value: number) {
        return (value < 10) ? `0${value}` : `${value}`;
    }

    toString() {
        //    11 10 09 08 07 06
        // BB                   AA
        //    00 01 02 03 04 05
        
        return `   ${this.pad(this.houses[11])} ${this.pad(this.houses[10])} ${this.pad(this.houses[9])} `
                + `${this.pad(this.houses[8])} ${this.pad(this.houses[7])} ${this.pad(this.houses[6])}\n`
                + `${this.pad(this.scoreB)}                   ${this.pad(this.scoreA)}\n`
                + `   ${this.pad(this.houses[0])} ${this.pad(this.houses[1])} ${this.pad(this.houses[2])} `
                + `${this.pad(this.houses[3])} ${this.pad(this.houses[4])} ${this.pad(this.houses[5])}`;
    }
}

