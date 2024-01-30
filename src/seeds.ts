class Coordinates {
    constructor(public x: number, public y: number) {
    }
}

export default (() => {
    const coordinates: Coordinates[][] = new Array(49).fill(null).map(() => []);
    const binStr = atob('AAAAAAAAAAAAAAgAAAAAIAAAAAIAACAACAACAAAiAAAAIgAAIgAIACIAACIAIgAiAAAiACoAIgAAIggiCCIAACoAqgAq' +
        'AACqAFUAqgAA1QCqANUAgFWAVYBVgFUAQQhBAFWqAFUA1QCq1QCqANUA1dUA1QDVANXVANUI1QDV1SDVANUC1dUg1QjVAtVVolWAVSLV1SLV' +
        'CNUi1dUi1SLVItXVItUq1SLVVSpVIlUqVQ==');
    for (let i = 0; i < 49; ++i) {
        const array = coordinates[i];
        let index;
        let mask;
        if (i <= 24) {
            index = i;
            mask = 0x00;
        } else {
            index = 49 - i;
            mask = 0xFF;
        }
        index *= 7;
        for (let y = 0; y < 7; ++y) {
            let byte = mask ^ binStr.charCodeAt(index + y);
            for (let x = 0; x < 7; ++x, byte >>= 1) {
                if ((byte & 1) === 1) {
                    array.push(new Coordinates(x, y));
                }
            }
        }
    }
    return coordinates;
})();