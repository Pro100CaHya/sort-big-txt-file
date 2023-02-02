import fs from "fs";

import * as lib from "./lib.js";

async function main() {
    // Создаём папку, куда в итоге попадёт отсортированный файл
    fs.mkdirSync(lib.DIR_TEMP, {
        recursive: true
    });

    // Если папка уже была (и в ней остались файлы), очищаем её
    fs.readdirSync(lib.DIR_TEMP).forEach((f) => fs.rmSync(`${lib.DIR_TEMP}/${f}`));

    /*
        Создаём промежуточные временные отсортированные файлы
        Берём несколько строк из входного файла, сортируем их и заносим во временные файлы
    */
    await lib.createTempSortedFiles(lib.INPUT_FILE_PATH);

    /*
        Объединяем временные отсортированные файлы в один
    */
    await lib.mergeTempSortedFiles();
}

await main();