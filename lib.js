import readline from "readline";
import { pipeline } from "stream/promises";
import { rm } from "fs/promises";
import fs from "fs";
import path from "path";
import url from "url";

export const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export const INPUT_FILE_PATH = path.resolve(__dirname, "input.txt");
export const DIR_TEMP = path.resolve(__dirname, "temp");

// Максимальное количество оперативной памяти (по условию задачи - 512 Мбайт)
const MAX_RAM = 1024 * 1024 * 512;

// Функция создания временных отсортированных файлов
export async function createTempSortedFiles(file) {
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
        
        /*
            Смотрим, чтоб размер временного файла не превышал
            размер оперативной памяти
        */
        
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

// Функция сортировки и записи данных во временный файл
export async function sortAndWriteToTempFile(lines, tempFileNumber) {
    const sortedLines = [...lines].sort((a, b) => a.localeCompare(b));
    const tempWriteStream = fs.createWriteStream(path.resolve(DIR_TEMP, `temp-${tempFileNumber}.txt`));

    await pipeline (
        sortedLines,
        tempWriteStream
    );
}

// Функция слияния временных файлов
export async function mergeTempSortedFiles() {
    // Названия файлов, которые нужно соединить в один
    let fileToMergeName = "temp";

    // Названия итоговых (объединённых файлов)
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
    
        /*
            Меняем названия файлов местами (не успел исправить :/)
            Изначально была задумка следующая: пусть будет файл №1 и файл №2.
            Все данные из файлов №1 и №2 объединяются и сортируются, затем
            записываются в файл №1, а файл №2 удаляется, и так с остальными файлами.
            Но на каком-то круге программа "зависает", и начинает бесконечно записывать даннные
            в файл №1.
        */
        let temp = fileToMergeName;
        fileToMergeName = mergedFilesName;
        mergedFilesName = temp;
    }
}

// Функция сортировки и слияния 2 временных файлов
export async function mergeAndSort(tmpFileNames, resultFileName) {
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

export function cleanUp(tmpFileNames) {
    return Promise.all(tmpFileNames.map((f) => rm(path.resolve(DIR_TEMP, f))));
}