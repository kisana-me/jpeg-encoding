let inputMatrix = []
let dctMatrix = []
let quantizedMatrix = []
let inverseDctMatrix = []

const zeroMatrix = () => Array.from({ length: 8 }, () => Array(8).fill(0))
const randomMatrix = () => Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => Math.floor(Math.random() * 256)))

// DCT変換
const C = (u) => u === 0 ? 1 / Math.sqrt(2) : 1
function DCTTransform(matrix) {
  let resultMatrix = zeroMatrix()
  for (let u = 0; u < 8; u++) {
    for (let v = 0; v < 8; v++) {
      let sum = 0
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
          sum += matrix[x][y] *
            Math.cos(((2 * x + 1) * u * Math.PI) / 16) *
            Math.cos(((2 * y + 1) * v * Math.PI) / 16);
        }
      }
      resultMatrix[v][u] = Math.round(1/4 * C(u) * C(v) * sum)
    }
  }
  return resultMatrix
}

// 量子化
function quantizeDCT(dctMatrix, quantTable) {
  let resultMatrix = zeroMatrix()
  for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        resultMatrix[i][j] = Math.round(dctMatrix[i][j] / quantTable[i][j])
      }
  }
  return resultMatrix
}

// ジグザグ順に並べ替える関数
function matrixScan(matrix, orderedMatrix) {
  const result = []
  let ctn = true
  let x = 0, y = 0
  for (let i = 0; i < 64; i++) {
    x = 0
    ctn = true
    while(x < 8 && ctn) {
      y=0
      while(y < 8 && ctn) {
        if(orderedMatrix[x][y] === i){
          result.push(matrix[x][y])
          ctn = false
        }
        y++
      }
      x++
    }
  }
  return result
}

// RLE符号化関数
function rleEncode(zigzagArray) {
  const encoded = [];
  let zeroCount = 0;

  for (let i = 1; i < zigzagArray.length; i++) { // DC係数（先頭）はそのまま
    const value = zigzagArray[i];
    if (value === 0) {
      zeroCount++;
    } else {
      encoded.push([zeroCount, value]); // (0の数, 値)
      zeroCount = 0;
    }
  }

  // 終端マーカーとして (0, 0) を追加
  encoded.push([0, 0]);

  return encoded;
}
// エントロピー符号化全体を行う関数
function entropyEncode(matrix, orderedMatrix) {
  const array = matrixScan(matrix, orderedMatrix)
  const dcCoefficient = array[0]// DC係数
  const acCoefficients = rleEncode(array)// AC係数
  return { dc: dcCoefficient, ac: acCoefficients }
}

function reduceMatrixData(matrix, reduceMatrix) {
  // const size = matrix.length;
  // for (let row = 4; row < size; row++) {
  //   for (let col = 0; col < size; col++) {
  //     matrix[row][col] = 0;
  //   }
  // }
  // for (let row = 0; row < size; row++) {
  //   for (let col = 4; col < size; col++) {
  //     matrix[row][col] = 0;
  //   }
  // }
  for(let i=0; i < 8; i++) {
    for(let j=0; j < 8; j++) {
      if(reduceMatrix[i][j] === 0){
        matrix[i][j]=0
      }
    }
  }
  return matrix
}

function generateRandomMatrix() {
  const matrix = [];
  let baseValue = Math.floor(Math.random() * 100) + 50; // 基本値をランダムに設定（50〜150の範囲）

  for (let i = 0; i < 8; i++) {
    const row = [];
    for (let j = 0; j < 8; j++) {
      // 基本値にランダムな変動を加え、段階的に値が変化するようにする
      const randomOffset = Math.floor(Math.random() * 20) - 10; // -10〜10の範囲で変動
      row.push(Math.min(Math.max(baseValue + randomOffset - i * 5 - j * 5, 0), 255)); // 値を0〜255の範囲に制限
    }
    matrix.push(row);
  }

  return matrix;
}


// グレースケールの背景色を設定してマトリックスをHTMLに描画する関数
const renderMatrix = (matrix, containerId, grayscale = false) => {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // 初期化
    matrix.forEach(row => {
        const rowDiv = document.createElement('div');
        row.forEach(value => {
            const cell = document.createElement('div');
            cell.className = 'matrix-cell';
            cell.textContent = Math.round(value);

            // グレースケール表示を設定
            if (grayscale) {
                // const grayValue = Math.min(255, Math.max(0, Math.round(value + 128))); // 値を0～255に変換
                const grayValue = Math.round(value) // 値を0～255に変換

                cell.style.backgroundColor = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
                cell.style.color = grayValue > 128 ? 'black' : 'white'; // 薄い背景には黒文字、濃い背景には白文字
            }
            rowDiv.appendChild(cell);
        });
        container.appendChild(rowDiv);
    });
};

function displayArray(arr, ele) {
  const container = document.getElementById(ele)
  container.innerHTML = JSON.stringify(arr, null, 2)
}

// 逆量子化と逆DCT変換を実行し、結果を表示
const applyInverseDCT = () => {
    if (quantizedMatrix.length === 0) {
        alert("先にDCT変換と量子化を実行してください。");
        return;
    }
    const dequantizedMatrix = inverseQuantizeDCT(quantizedMatrix, quantizationTable);
    inverseDctMatrix = InverseDCTTransform(dequantizedMatrix);
    renderMatrix(inverseDctMatrix, 'inverseDctMatrix', true);
}

// 高周波成分を削除した逆DCT変換を実行し、結果を表示
const applyInverseDCTWithHighFreqRemoval = () => {
    if (quantizedMatrix.length === 0) {
        alert("先にDCT変換と量子化を実行してください。");
        return;
    }
    const lowFreqMatrix = removeHighFrequencies(quantizedMatrix);
    const dequantizedLowFreqMatrix = inverseQuantizeDCT(lowFreqMatrix, quantizationTable);
    const inverseLowFreqDctMatrix = InverseDCTTransform(dequantizedLowFreqMatrix);
    renderMatrix(inverseLowFreqDctMatrix, 'inverseDctMatrixHighFreqRemoved', true);
}

// 定数
const quantizationTable = [
  [16, 11, 10, 16, 24, 40, 51, 61],
  [12, 12, 14, 19, 26, 58, 60, 55],
  [14, 13, 16, 24, 40, 57, 69, 56],
  [14, 17, 22, 29, 51, 87, 80, 62],
  [18, 22, 37, 56, 68, 109, 103, 77],
  [24, 35, 55, 64, 81, 104, 113, 92],
  [49, 64, 78, 87, 103, 121, 120, 101],
  [72, 92, 95, 98, 112, 100, 103, 99]
]
const reduceMatrix = [
  [ 1, 1, 1, 1, 1, 1, 1, 0],
  [ 1, 1, 1, 1, 1, 1, 0, 0],
  [ 1, 1, 1, 1, 1, 0, 0, 0],
  [ 1, 1, 1, 1, 0, 0, 0, 0],
  [ 1, 1, 1, 0, 0, 0, 0, 0],
  [ 1, 1, 0, 0, 0, 0, 0, 0],
  [ 1, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0]
]
const zigzagOrder = [
  [ 0,  1,  5,  6, 14, 15, 27, 28],
  [ 2,  4,  7, 13, 16, 26, 29, 42],
  [ 3,  8, 12, 17, 25, 30, 41, 43],
  [ 9, 11, 18, 24, 31, 40, 44, 53],
  [10, 19, 23, 32, 39, 45, 52, 54],
  [20, 22, 33, 38, 46, 51, 55, 60],
  [21, 34, 37, 47, 50, 56, 59, 61],
  [35, 36, 48, 49, 57, 58, 62, 63]
]
const horizontalOrder = [
  [ 1,  2,  3,  4,  5,  6,  7,  8],
  [ 9, 10, 11, 12, 13, 14, 15, 16],
  [17, 18, 19, 20, 21, 22, 23, 24],
  [25, 26, 27, 28, 29, 30, 31, 32],
  [33, 34, 35, 36, 37, 38, 39, 40],
  [41, 42, 43, 44, 45, 46, 47, 48],
  [49, 50, 51, 52, 53, 54, 55, 56],
  [57, 58, 59, 60, 61, 62, 63, 64]
]
const matrix1 = [
  [114, 108, 100, 99, 109, 129, 152, 166],
  [109, 102, 95, 94, 104, 124, 146, 161],
  [99, 93, 85, 84, 94, 114, 137, 151],
  [86, 80, 72, 71, 82, 102, 124, 138],
  [73, 66, 58, 57, 68, 88, 110, 125],
  [60, 53, 46, 45, 55, 75, 97, 112],
  [50, 43, 36, 35, 45, 65, 88, 102],
  [45, 38, 31, 30, 40, 60, 82, 97]
]
const matrix2 = [
  [200, 180, 160, 140, 120, 100, 80, 60],
  [195, 175, 155, 135, 115, 95, 75, 55],
  [190, 170, 150, 130, 110, 90, 70, 50],
  [185, 165, 145, 125, 105, 85, 65, 45],
  [180, 160, 140, 120, 100, 80, 60, 40],
  [175, 155, 135, 115, 95, 75, 55, 35],
  [170, 150, 130, 110, 90, 70, 50, 30],
  [165, 145, 125, 105, 85, 65, 45, 25]
];

const matrix3 = [
  [32, 45, 56, 64, 72, 86, 100, 110],
  [45, 50, 60, 72, 80, 94, 108, 115],
  [55, 64, 70, 82, 94, 108, 120, 130],
  [60, 70, 80, 90, 104, 116, 130, 140],
  [70, 80, 90, 100, 116, 128, 140, 150],
  [80, 90, 100, 110, 124, 140, 150, 160],
  [94, 108, 120, 130, 140, 150, 165, 175],
  [108, 120, 130, 140, 155, 165, 180, 190]
];

// HTML表示
function setMatrix(m) {
  switch(m) {
    case 'matrix1':
      inputMatrix = matrix1
      break
    case 'matrix2':
      inputMatrix = matrix2
      break
    
    case 'matrix3':
      inputMatrix = matrix3
      break
    case 'random-matrix':
      inputMatrix = randomMatrix()
      break
    
    case 'random2-matrix':
      inputMatrix = generateRandomMatrix()
      break
    default:
      break
  }
  renderMatrix(inputMatrix, 'inputMatrix', true)
}

function applyDCT() {
  dctMatrix = DCTTransform(inputMatrix)
  renderMatrix(dctMatrix, 'dctMatrix', true)
  // displayArray(dctMatrix, 'inputArray')
}

function applyQuantization() {
  quantizedMatrix = quantizeDCT(dctMatrix, quantizationTable)
  renderMatrix(quantizedMatrix, 'quantizedMatrix', true)
}
function applyReduce() {
  reduceMatrixData(quantizedMatrix, reduceMatrix)
  renderMatrix(quantizedMatrix, 'quantizedMatrix', true)
}

function applyEntropyEncoding() {
  const zigzagScanEncodedResult = entropyEncode(quantizedMatrix, zigzagOrder)
  document.getElementById('zigzagScan-entropyEncodedData').innerHTML = JSON.stringify(zigzagScanEncodedResult)
  document.getElementById('zigzagScan-entropyEncodedDataSize').innerHTML = JSON.stringify(zigzagScanEncodedResult).length
  const horizontalScanEncodedResult = entropyEncode(quantizedMatrix, horizontalOrder)
  document.getElementById('horizontalScan-entropyEncodedData').innerHTML = JSON.stringify(horizontalScanEncodedResult)
  document.getElementById('horizontalScan-entropyEncodedDataSize').innerHTML = JSON.stringify(horizontalScanEncodedResult).length
}

function ntimestry(times = 10) {
  let zigzagResults = []
  let horizontalResults = []
  let diffResults = []
  for(i=0; i<times; i++){
    inputMatrix = generateRandomMatrix()
    dctMatrix = DCTTransform(inputMatrix)
    quantizedMatrix = quantizeDCT(dctMatrix, quantizationTable)
    reduceMatrixData(quantizedMatrix, reduceMatrix)//?
    const zigzagScanEncodedResult = entropyEncode(quantizedMatrix, zigzagOrder)
    document.getElementById('zigzagScan-entropyEncodedData').innerHTML = JSON.stringify(zigzagScanEncodedResult)
    document.getElementById('zigzagScan-entropyEncodedDataSize').innerHTML = JSON.stringify(zigzagScanEncodedResult).length
    zigzagResults.push(JSON.stringify(zigzagScanEncodedResult).length)
    const horizontalScanEncodedResult = entropyEncode(quantizedMatrix, horizontalOrder)
    document.getElementById('horizontalScan-entropyEncodedData').innerHTML = JSON.stringify(horizontalScanEncodedResult)
    document.getElementById('horizontalScan-entropyEncodedDataSize').innerHTML = JSON.stringify(horizontalScanEncodedResult).length
    horizontalResults.push(JSON.stringify(horizontalScanEncodedResult).length)
    diffResults.push(JSON.stringify(zigzagScanEncodedResult).length - JSON.stringify(horizontalScanEncodedResult).length)
    renderMatrix(inputMatrix, 'inputMatrix', true)
    renderMatrix(dctMatrix, 'dctMatrix', true)
    renderMatrix(quantizedMatrix, 'quantizedMatrix', true)
  }
  console.log('zz', zigzagResults)
  console.log('ho', horizontalResults)
  console.log('df', diffResults)
}