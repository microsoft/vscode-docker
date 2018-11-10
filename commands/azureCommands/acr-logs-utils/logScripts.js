// Global Variables
const status = {
    'Succeeded': 4,
    'Queued': 3,
    'Error': 2,
    'Failed': 1
}

var currentItemsCount = 4;
var currentDir = "asc"
var triangles = {
    'down': '&nbsp;<i class="ms-Icon ms-Icon--ChevronDown"></i>',
    'up': '&nbsp;<i class="rotate180 ms-Icon ms-Icon--ChevronDown"></i>'
}

document.addEventListener("scroll", function () {
    var translate = "translate(0," + this.lastChild.scrollTop + "px)";
    let fixedItems = this.querySelectorAll(".fixed");
    for (item of fixedItems) {
        item.style.transform = translate;
    }
});

// Main
let content = document.querySelector('#core');
const vscode = acquireVsCodeApi();
setLoadMoreListener();
setInputListeners();
loading();

document.onkeydown = function (event) {
    if (event.key === "Enter") { // The Enter/Return key
        document.activeElement.onclick(event);
    }
};

/* Sorting
 * PR note, while this does not use a particularly quick algorithm
 * it allows a low stuttering experience that allowed rapid testing.
 * I will improve it soon.*/
function sortTable(n, dir = "asc", holdDir = false) {
    currentItemsCount = n;
    let table, rows, switching, i, x, y, shouldSwitch, switchcount = 0;
    let cmpFunc = acquireCompareFunction(n);
    table = document.getElementById("core");
    switching = true;
    //Set the sorting direction to ascending:

    while (switching) {
        switching = false;
        rows = table.querySelectorAll(".holder");
        for (i = 0; i < rows.length - 1; i++) {
            shouldSwitch = false;
            x = rows[i].getElementsByTagName("TD")[n + 1];
            y = rows[i + 1].getElementsByTagName("TD")[n + 1];
            if (dir == "asc") {
                if (cmpFunc(x, y)) {
                    shouldSwitch = true;
                    break;
                }
            } else if (dir == "desc") {
                if (cmpFunc(y, x)) {
                    shouldSwitch = true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            switchcount++;
        } else {
            /*If no switching has been done AND the direction is "asc", set the direction to "desc" and run the while loop again.*/
            if (switchcount == 0 && dir == "asc" && !holdDir) {
                dir = "desc";
                switching = true;
            }
        }
    }
    if (!holdDir) {
        let sortColumns = document.querySelectorAll(".sort");
        if (sortColumns[n].innerHTML === triangles['down']) {
            sortColumns[n].innerHTML = triangles['up'];
        } else if (sortColumns[n].innerHTML === triangles['up']) {
            sortColumns[n].innerHTML = triangles['down'];
        } else {
            for (cell of sortColumns) {
                cell.innerHTML = '  ';
            }
            sortColumns[n].innerHTML = triangles['down'];
        }
    }
    currentDir = dir;
}

function acquireCompareFunction(n) {
    switch (n) {
        case 0: //Name
        case 1: //Task
            return (x, y) => {
                return x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()
            }
        case 2: //Status
            return (x, y) => {
                return status[x.dataset.status] > status[y.dataset.status];;
            }
        case 3: //Created time
            return (x, y) => {
                if (x.dataset.createdtime === '') return true;
                if (y.dataset.createdtime === '') return false;
                let dateX = new Date(x.dataset.createdtime);
                let dateY = new Date(y.dataset.createdtime);
                return dateX > dateY;
            }
        case 4: //Elapsed time
            return (x, y) => {
                if (x.innerHTML === '') return true;
                if (y.innerHTML === '') return false;
                return Number(x.innerHTML.substring(0, x.innerHTML.length - 1)) > Number(y.innerHTML.substring(0, y.innerHTML.length - 1));
            }
        case 5: //OS Type
            return (x, y) => {
                return x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()
            }
        default:
            throw 'Could not acquire Compare function, invalid n';
    }
}

// Event Listener Setup
window.addEventListener('message', event => {
    const message = event.data; // The JSON data our extension sent
    if (message.type === 'populate') {
        content.insertAdjacentHTML('beforeend', message.logComponent);

        let item = content.querySelector(`#btn${message.id}`);
        setSingleAccordion(item);

        let panel = item.nextElementSibling;

        const logButton = panel.querySelector('.openLog');
        setLogBtnListener(logButton, false);
        const downloadlogButton = panel.querySelector('.downloadlog');
        setLogBtnListener(downloadlogButton, true);

        const digestClickables = panel.querySelectorAll('.copy');
        setDigestListener(digestClickables);

    } else if (message.type === 'endContinued') {
        sortTable(currentItemsCount, currentDir, true);
        loading();
    } else if (message.type === 'end') {
        window.addEventListener("resize", setAccordionTableWidth);
        setAccordionTableWidth();
        setTableSorter();
        loading();
    }

    if (message.canLoadMore) {
        const loadBtn = document.querySelector('.loadMoreBtn');
        loadBtn.style.display = 'flex';
    }

});

function setSingleAccordion(item) {
    item.onclick = function (event) {
        this.classList.toggle('active');
        this.querySelector('.arrow').classList.toggle('activeArrow');
        let panel = this.nextElementSibling;
        if (panel.style.maxHeight) {
            panel.style.display = 'none';
            panel.style.maxHeight = null;
            let index = openAccordions.indexOf(panel);
            if (index > -1) {
                openAccordions.splice(index, 1);
            }
        } else {
            openAccordions.push(panel);
            setAccordionTableWidth();
            panel.style.display = 'table-row';
            let paddingTop = +panel.style.paddingTop.split('px')[0];
            let paddingBottom = +panel.style.paddingBottom.split('px')[0];
            panel.style.maxHeight = (panel.scrollHeight + paddingTop + paddingBottom) + 'px';
        }
    };
}

function setTableSorter() {
    let tableHeader = document.querySelector("#tableHead");
    let items = tableHeader.querySelectorAll(".colTitle");
    for (let i = 0; i < items.length; i++) {
        items[i].onclick = () => {
            sortTable(i);
        };
    }
}

function setLogBtnListener(item, download) {
    item.onclick = (event) => {
        vscode.postMessage({
            logRequest: {
                'id': event.target.dataset.id,
                'download': download
            }
        });
    };
}

function setLoadMoreListener() {
    let item = document.querySelector("#loadBtn");
    item.onclick = function () {
        const loadBtn = document.querySelector('.loadMoreBtn');
        loadBtn.style.display = 'none';
        loading();
        vscode.postMessage({
            loadMore: true
        });
    };
}

function setDigestListener(digestClickables) {
    for (digest of digestClickables) {
        digest.onclick = function (event) {
            vscode.postMessage({
                copyRequest: {
                    'text': event.target.parentNode.dataset.digest,
                }
            });
        };
    }
}

let openAccordions = [];

function setAccordionTableWidth() {
    let headerCells = document.querySelectorAll("#core thead tr th");
    let topWidths = [];
    for (let cell of headerCells) {
        topWidths.push(parseInt(getComputedStyle(cell).width));
    }
    for (acc of openAccordions) {
        let cells = acc.querySelectorAll(".innerTable th, .innerTable td"); // 4 items
        const cols = acc.querySelectorAll(".innerTable th").length + 1; //Account for arrowHolder
        const rows = cells.length / cols;
        //cells[0].style.width = topWidths[0];
        for (let row = 0; row < rows; row++) {
            for (let col = 1; col < cols - 1; col++) {
                let cell = cells[row * cols + col];
                cell.style.width = topWidths[col - 1] + "px"
            }
        }
    }
}

function setInputListeners() {
    const inputFields = document.querySelectorAll("input");
    const loadBtn = document.querySelector('.loadMoreBtn');
    for (let inputField of inputFields) {
        inputField.addEventListener("keyup", function (event) {
            if (event.key === "Enter") {
                clearLogs();
                loading();
                loadBtn.style.display = 'none';
                vscode.postMessage({
                    loadFiltered: {
                        filterString: getFilterString(inputFields)
                    }
                });
            }
        });
    }
}

/*interface Filter
    image?: string;
    runId?: string;
    runTask?: string;
*/
function getFilterString(inputFields) {
    let filter = {};
    if (inputFields[0].value.length > 0) { //Run Id
        filter.runId = inputFields[0].value;
    } else if (inputFields[1].value.length > 0) { //Task id
        filter.task = inputFields[1].value;
    }
    return filter;
}

function clearLogs() {
    let items = document.querySelectorAll("#core tbody");
    for (let item of items) {
        item.remove();
    }
}
var shouldLoad = false;

function loading() {
    const loader = document.querySelector('#loadingDiv');
    if (shouldLoad) {
        loader.style.display = 'flex';
    } else {
        loader.style.display = 'none';
    }
    shouldLoad = !shouldLoad;
}
