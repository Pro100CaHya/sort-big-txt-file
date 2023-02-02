import url from "url";
import fs from "fs";
import { rm } from "fs/promises";
import path from "path";
import readline from "readline";
import { pipeline } from "stream/promises";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const INPUT_FILE_PATH = path.resolve(__dirname, "input.txt");
const DIR_TEMP = path.resolve(__dirname, "temp");

// Максимальное количество оперативной памяти (по условию задачи - 512 Мбайт)
const MAX_RAM = 1024 * 256;

async function createTempSortedFiles(file) {
    let tempFileNumber = 0;
    let lineSize = 0;
    const linesArr = [];

    const inputFileReadStream = fs.createReadStream(file, {
        highWaterMark: MAX_RAM / 2,
    });

    const inputFileReadline = readline.createInterface({
        input: inputFileReadStream,
        crlfDelay: Infinity
    });

    for await (const line of inputFileReadline) {
        if (lineSize + line.length + 1 > MAX_RAM) {
            await sortAndWriteToTempFile(linesArr, tempFileNumber++);

            linesArr.length = 0;
            lineSize = 0;
        }

        linesArr.push(`${line}\n`);
        lineSize = lineSize + line.length + 1;
    }

    if (linesArr.length !== 0) {
        await sortAndWriteToTempFile(linesArr, tempFileNumber++);
    }
}

async function sortAndWriteToTempFile(lines, tempFileNumber) {
    const sortedLines = [...lines].sort((a, b) => a.localeCompare(b));
    const tempWriteStream = fs.createWriteStream(path.resolve(DIR_TEMP, `temp-${tempFileNumber}.txt`));

    await pipeline (
        sortedLines,
        tempWriteStream
    );
}

async function mergeTempSortedFiles() {
    let fileToMergeName = "temp";
    let mergedFilesName = "merged";

    while (fs.readdirSync(DIR_TEMP).length !== 1) {
        let count = Math.ceil(fs.readdirSync(DIR_TEMP).length / 2);

        for (let i = 0; i < count; i++) {
            const filesToMerge = [];
    
            for (let j = 0; j < 2; j++) {
                if (fs.existsSync(path.resolve(DIR_TEMP, `${fileToMergeName}-${i * 2 + j}.txt`))) {
                    filesToMerge.push(`${fileToMergeName}-${i * 2 + j}.txt`);
                }
            }
    
            await mergeAndSort(filesToMerge, path.resolve(DIR_TEMP, `${mergedFilesName}-${i}.txt`));
            await cleanUp(filesToMerge);
        }
    
        let temp = fileToMergeName;
        fileToMergeName = mergedFilesName;
        mergedFilesName = temp;
    }
}

function cleanUp(tmpFileNames) {
    return Promise.all(tmpFileNames.map(f => rm(path.resolve(DIR_TEMP, f))));
}

async function mergeAndSort(tmpFileNames, resultFileName) {
    const lines = tmpFileNames.map((elem) => {
        return readline.createInterface({
            input: fs.createReadStream(path.resolve(DIR_TEMP, elem), {
                highWaterMark: MAX_RAM / 4,
            }),
            crlfDelay: Infinity
        })[Symbol.asyncIterator]()
    });

    const values = await Promise.all(
        lines.map((r) => r.next().then((e) => e.value))
    );

    const file = fs.createWriteStream(resultFileName);

    return pipeline(
        async function* () {
            while (lines.length > 0) {
                const [minVal, i] = values.reduce((prev, cur, idx) => {
                    if (cur.localeCompare(prev[0]) <= 0 || prev[0] === undefined) {
                        return [cur, idx];
                    }
                    else {
                        return prev;
                    }
                }, [undefined, -1]);

                yield `${minVal}\n`;
        
                const res = await lines[i].next();
        
                if (!res.done) {
                    values[i] = res.value;
                } else {
                    values.splice(i, 1);
                    lines.splice(i, 1);
                }
            }
        },
        file
    )
}

async function main() {
    // Создаём папку, куда в итоге попадёт отсортированный файл
    fs.mkdirSync(DIR_TEMP, {
        recursive: true
    });

    // Если папка уже была (и в ней остались файлы), очищаем её
    fs.readdirSync(DIR_TEMP).forEach((f) => fs.rmSync(`${DIR_TEMP}/${f}`));

    /*
        Создаём промежуточные временные отсортированные файлы
        Берём несколько строк из входного файла, сортируем их и заносим во временные файлы
    */
    await createTempSortedFiles(INPUT_FILE_PATH);

    /*
        Объединяем временные отсортированные файлы в один
    */
    await mergeTempSortedFiles();
}

await main();