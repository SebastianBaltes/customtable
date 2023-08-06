# customtable

A React Datasheet Grid Component, similar to Handsontable. Unfortunately, despite intensive research, it was only after advanced implementation, when I finally came up with the name "react-datasheet-grid" and searched for name collisions, that I stumbled upon the already existing and unfortunately excellent

https://github.com/nick-keller/react-datasheet-grid

Shit happens :)

What makes this approach interesting:

It is a native HTML table, without virtualizing/windowing. This leaves the layout entirely to the browser, which saves some complexity, and the layout is top-notch.

The downside, however, is that the grid size is practically limited, meaning in an application with a lot of data, you have to use pagination instead of infinite scroll. However, pagination seems absolutely sufficient to me.

One advantage over react-datasheet-grid: Multiple sticky columns are possible.

# todo

- Copy & Paste
- undo / redo
- Creation of rows
- Deletion of rows
- Sorting by clicking on the column headers
- Filters in the column headers
- String editor
- Boolean editor
- Combobox
- Multi-combobox
- Unit tests
