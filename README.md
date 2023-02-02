# Сортировка большого файла

## Постановка задачи

Дан текстовый файл размером 1 Тбайт, содержащий строки. Необходимо написать программу, выполняющую сортировку файла на компьютере, объём ОЗУ которого равен 500 Мбайт.

## Решение

Т.к. объём файла очень большой, а количество оперативной памяти мало, то чтение файла и загрузка в массив, а затем его дальнейшая сортировка, не подходит - среде выполнения может просто не хватить оперативной памяти. Суть решения данной проблемы заключается в делении исходного большого файла на файлы меньшего размера, затем объединение в итоговый отсортированный файл.

Итак, решение состоит из нескольких шагов:

1. Разбиение данных входного (большого) файла на маленькие наборы данных
2. Сортировка маленьких наборов данных
3. Запись отсортированных маленьких наборов данных во промежуточные временные файлы
4. Слияние отсортированных маленьких наборов данных в один итоговый отсортированный файл

Итоговый отсортированный файл окажется единственным в папке **temp**.

Для эффективной работы алгоритма необходимо учитывать ограничение по количеству оперативной памяти. Т.к. объем ОЗУ, по условию, равен 512 Мбайт, то размер буфера потока чтения следует устанавливать не более 512 Мбайт.

Объём памяти можно задать [здесь](https://github.com/Pro100CaHya/sort-big-txt-file/blob/master/lib.js#L14)

В качестве примера текстового файла представлен файл **input.txt**, содержащий 143 100 строк
