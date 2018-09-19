// **** ADAPTED FROM HTML DEMO AT ****
// DEMO = http://bz.var.ru/comp/web/resizable.html
// JS = http://bz.var.ru/comp/web/resizable-tables.js
//  ******* ORIGINAL SCRIPT HEADER *******
// Resizable Table Columns.
//  version: 1.0
//
// (c) 2006, bz
//
// 25.12.2006:  first working prototype
// 26.12.2006:  now works in IE as well but not in Opera (Opera is @#$%!)
// 27.12.2006:  changed initialization, now just make class='resizable' in table and load script
//=====================================================
//Changelog
//-Removed cookies
//-limited functionality to manually selected table

function preventEvent(e) {
    let ev = e || window.event;
    if (ev.preventDefault) ev.preventDefault();
    else ev.returnValue = false;
    if (ev.stopPropagation)
        ev.stopPropagation();
    return false;
}

function getStyle(x, styleProp) {
    let y;
    if (x.currentStyle)
        y = x.currentStyle[styleProp];
    else if (window.getComputedStyle)
        y = document.defaultView.getComputedStyle(x, null).getPropertyValue(styleProp);
    return y;
}

function getWidth(x) {
    return document.defaultView.getComputedStyle(x, null).getPropertyValue("width");
}

// main class prototype
function ColumnResize(table) {
    this.id = table.id;
    // private data
    let self = this;

    let dragColumns = table.rows[0].cells; // first row columns, used for changing of width
    if (!dragColumns) return; // return if no table exists or no one row exists

    let dragColumnNo; // current dragging column
    let dragX; // last event X mouse coordinate

    let saveOnmouseup; // save document onmouseup event handler
    let saveOnmousemove; // save document onmousemove event handler
    let saveBodyCursor; // save body cursor property

    // do changes columns widths
    // returns true if success and false otherwise
    this.changeColumnWidth = function (no, w) {
        if (no === 0) return false; // Ignores first item
        if (no === dragColumns.length - 1) return false; // Ignores last item

        if (parseInt(dragColumns[no].style.width) <= -w) return false;
        if (dragColumns[no + 1] && parseInt(dragColumns[no + 1].style.width) <= w) return false;

        dragColumns[no].style.width = parseInt(dragColumns[no].style.width) + w + 'px';
        if (dragColumns[no + 1])
            dragColumns[no + 1].style.width = parseInt(dragColumns[no + 1].style.width) - w + 'px';

        return true;
    }

    // do drag column width
    this.columnDrag = function (e) {
        var e = e || window.event;
        var X = e.clientX || e.pageX;
        if (!self.changeColumnWidth(dragColumnNo, X - dragX)) {
            // stop drag!
            self.stopColumnDrag(e);
        }

        dragX = X;
        // prevent other event handling
        preventEvent(e);
        return false;
    }

    // stops column dragging
    this.stopColumnDrag = function (e) {
        var e = e || window.event;
        if (!dragColumns) return;

        // restore handlers & cursor
        document.onmouseup = saveOnmouseup;
        document.onmousemove = saveOnmousemove;
        document.body.style.cursor = saveBodyCursor;
        preventEvent(e);
    }

    // init data and start dragging
    this.startColumnDrag = function (e) {
        var e = e || window.event;

        // if not first button was clicked
        //if (e.button != 0) return;

        // remember dragging object
        dragColumnNo = (e.target || e.srcElement).parentNode.parentNode.cellIndex;
        dragX = e.clientX || e.pageX;

        // set up current columns widths in their particular attributes
        // do it in two steps to avoid jumps on page!
        let colWidth = [];
        for (let i = 0; i < dragColumns.length; i++) {
            colWidth[i] = parseInt(getWidth(dragColumns[i]));
        }
        for (let i = 0; i < dragColumns.length; i++) {
            dragColumns[i].width = ""; // for sure
            dragColumns[i].style.width = colWidth[i] + "px";
        }

        saveOnmouseup = document.onmouseup;
        document.onmouseup = self.stopColumnDrag;

        saveBodyCursor = document.body.style.cursor;
        document.body.style.cursor = 'w-resize';

        // fire!
        saveOnmousemove = document.onmousemove;
        document.onmousemove = self.columnDrag;

        preventEvent(e);
    }

    // prepare table header to be draggable
    // it runs during class creation
    for (let i = 1; i < dragColumns.length - 1; i++) {
        dragColumns[i].innerHTML = "<div class='dragWrapper'>" +
            "<div class='dragLine'>" +
            "</div>" +
            dragColumns[i].innerHTML +
            "</div>";
        dragColumns[i].firstChild.firstChild.onmousedown = this.startColumnDrag;
    }
}

// select all tables and make resizable those that have 'resizable' class
let resizableTables = [];

function ResizableColumns() {

    var tables = document.getElementsByTagName('table');
    for (var i = 0; tables.item(i); i++) {
        if (tables[i].className.match(/resizable/)) {
            // generate id
            if (!tables[i].id) tables[i].id = 'table' + (i + 1);
            // make table resizable
            resizableTables[resizableTables.length] = new ColumnResize(tables[i]);
        }
    }
}

try {
    window.addEventListener('load', ResizableColumns, false);
} catch (e) {
    window.onload = ResizableColumns;
}
