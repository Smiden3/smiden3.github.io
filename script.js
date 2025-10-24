// Сообщаем, что наш "мозг" (script.js) v5.1 (DOM Ready!)
console.log("Мозг (script.js) v5.1 (DOM Ready!) подключен!");

// --- Глобальные настройки ---
// (Они могут быть снаружи, т.к. не "трогают" HTML)
const API_URL = "https://script.google.com/macros/s/AKfycbzkDWk51h1BZCJXzS8MIGtXSQJh7esMEFQ2dka3s3SAePDPKEWVv0nomGJ87jKJaVu8ZA/exec";
let allItems = []; // Наша "память"
let isWaybillModeActive = false; // "Режим накладной" выключен? (Да)
let waybillItems = []; // Наш "список" для накладной (пока пустой)

// -----------------------------------------------------------------
// ГЛАВНАЯ "ОБЕРТКА": Ждем, пока HTML "построится"
// -----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function() {

    console.log("HTML 'построен'. Запускаем скрипты.");

    // --- 1. ТЕПЕРЬ "НАХОДИМ" ЭЛЕМЕНТЫ ---
    // (Теперь они 100% существуют на странице)

    // Форма добавления
    const addItemForm = document.getElementById("addItemForm");
    const itemNameInput = document.getElementById("itemName");
    const itemSkuInput = document.getElementById("itemSku");
    const itemManufacturerInput = document.getElementById("itemManufacturer");
    const itemPriceInput = document.getElementById("itemPrice");
    const itemQuantityInput = document.getElementById("itemQuantity");
    const itemImageInput = document.getElementById("itemImage");

    // "Дисплеи" в шапке
    const summaryTotalCount = document.getElementById("summary-total-count");
    const summaryTotalPrice = document.getElementById("summary-total-price");
    const summaryLowStock = document.getElementById("summary-low-stock");

    // Сетка
    const itemsGridContainer = document.querySelector(".items-grid");

    // --- Находим "Панель Управления" ---
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const btnShowLowStock = document.getElementById("btnShowLowStock");
    // Модальное окно
    const editModalBackdrop = document.getElementById("editModalBackdrop");
    const editItemForm = document.getElementById("editItemForm");
    const btnCancelEdit = document.getElementById("btnCancelEdit");
    const editItemId = document.getElementById("editItemId");
    const editItemName = document.getElementById("editItemName");
    const editItemSku = document.getElementById("editItemSku");
    const editItemManufacturer = document.getElementById("editItemManufacturer");
    const editItemPrice = document.getElementById("editItemPrice");
    const editItemQuantity = document.getElementById("editItemQuantity");
    const editItemImage = document.getElementById("editItemImage");

    // --- Находим "Элементы Накладной" ---
    const btnToggleWaybillMode = document.getElementById("btnToggleWaybillMode");
    const waybillModalBackdrop = document.getElementById("waybillModalBackdrop");
    const waybillItemsList = document.getElementById("waybillItemsList");
    const waybillTotalPrice = document.getElementById("waybillTotalPrice");
    const btnCancelWaybill = document.getElementById("btnCancelWaybill");
    const btnClearWaybill = document.getElementById("btnClearWaybill");

    // --- 2. ТЕПЕРЬ "ВЕШАЕМ ПРОСЛУШКИ" ---

    // "Прослушка" формы ДОБАВЛЕНИЯ
    addItemForm.addEventListener("submit", function(event) {
        event.preventDefault();
        console.log("Форма отправлена (POST, no-cors)...");

        const itemData = {
            name: itemNameInput.value.trim(),
            sku: itemSkuInput.value.trim(),
            manufacturer: itemManufacturerInput.value.trim(),
            price: parseFloat(itemPriceInput.value),
            quantity: parseInt(itemQuantityInput.value),
            image: itemImageInput.value.trim()
        };

        const payload = {
            action: "addItem",
            itemData: itemData
        };

        fetch(API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(payload)
        })
        .then(response => {
            console.log("Запрос 'addItem' отправлен. Считаем, что все успешно.");
            alert("Товар успешно добавлен!");
            addItemForm.reset();
            loadItems();
        })
        .catch(error => {
            console.error("Ошибка 'телефонного звонка' (addItem, no-cors):", error);
            alert("Критическая ошибка: " + error.message);
        });
    });

    // (после "прослушки" addItemForm.addEventListener...)

// --- "Прослушка" формы РЕДАКТИРОВАНИЯ ---
    editItemForm.addEventListener("submit", function(event) {
        event.preventDefault(); // Отменяем перезагрузку

        // 1. Собираем ВСЕ данные из полей модального окна
        const itemData = {
            id: editItemId.value, // <-- Берем "спрятанный" ID!
            name: editItemName.value.trim(),
            sku: editItemSku.value.trim(),
            manufacturer: editItemManufacturer.value.trim(),
            price: parseFloat(editItemPrice.value),
            quantity: parseInt(editItemQuantity.value),
            image: editItemImage.value.trim()
        };

        // 2. Готовим "посылку"
        const payload = {
            action: "updateItem",
            itemData: itemData // Отправляем ВЕСЬ объект
        };

        console.log("Отправляем 'updateItem' (no-cors)...", payload);

        // 3. Используем нашу "магическую" 'no-cors' отправку
        fetch(API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(payload)
        })
        .then(response => {
            // 4. Мы "верим" в успех (раз нет ошибки)
            console.log("Запрос 'updateItem' отправлен. Считаем, что все успешно.");

            // 5. Закрываем окно
            closeEditModal();

            alert("Товар успешно обновлен!");

            // 6. Обновляем список, чтобы увидеть изменения
            loadItems();
        })
        .catch(error => {
            console.error("Критическая ошибка при обновлении:", error);
            alert("Не удалось обновить товар: " + error.message);
        });
    });

// (дальше идут прослушки "itemsGridContainer", "btnCancelEdit"...)

    // "Прослушка" СЕТКИ (Удалить / Редактировать / ВЫБРАТЬ)
    itemsGridContainer.addEventListener("click", function(event) {

        // 1. Проверяем, "включен" ли "режим накладной"?
        if (isWaybillModeActive) {

            // --- РЕЖИМ НАКЛАДНОЙ ВКЛЮЧЕН ---
            // (Мы НЕ хотим, чтобы "Удалить"/"Редактировать" срабатывали)

            // Находим карточку, по которой кликнули
            // (Неважно, кликнули мы на кнопку или на саму карточку)
            const card = event.target.closest(".item-card");

            if (card) { // Убедимся, что кликнули именно на карточку
                // Вызываем новую функцию "Выбора"
                toggleWaybillItem(card);
            }

        } else {

            // --- ОБЫЧНЫЙ РЕЖИМ (как было раньше) ---

            // Клик на "Удалить"?
            if (event.target.classList.contains("btn-delete")) {
                const card = event.target.closest(".item-card");
                const itemId = card.dataset.id;
                if (confirm(`Вы уверены, что хотите удалить товар (ID: ${itemId})?`)) {
                    deleteItem(itemId);
                }
            }

            // Клик на "Редактировать"?
            if (event.target.classList.contains("btn-edit")) {
                const card = event.target.closest(".item-card");
                const itemId = card.dataset.id;
                openEditModal(itemId);
            }
        }
    });

    // "Прослушка" кнопок ЗАКРЫТИЯ ОКНА
    btnCancelEdit.addEventListener("click", function() {
        closeEditModal();
    });

    editModalBackdrop.addEventListener("click", function(event) {
        if (event.target === editModalBackdrop) {
            closeEditModal();
        }
    });

            // --- НОВАЯ "ПРОСЛУШКА" ДЛЯ ГЛАВНОЙ КНОПКИ "НАКЛАДНОЙ" ---
    btnToggleWaybillMode.addEventListener("click", function() {
        if (isWaybillModeActive) {
            // Если мы УЖЕ "в режиме" -> "Показываем" Окно
            openWaybillModal();
        } else {
            // Если мы НЕ "в режиме" -> "Включаем" Режим
            enterWaybillMode();
        }
    });

        // --- "Прослушки" Окна НАКЛАДНОЙ ---

    // 1. Клик на "Закрыть"
    btnCancelWaybill.addEventListener("click", closeWaybillModal);

    // 2. Клик на "Очистить"
    btnClearWaybill.addEventListener("click", clearWaybill);

    // 3. Клик "мимо" окна
    waybillModalBackdrop.addEventListener("click", function(event) {
        if (event.target === waybillModalBackdrop) {
            closeWaybillModal();
        }
    });
        // (Тут твои старые "прослушки": addItemForm, editItemForm, ...)
    // (после 'editModalBackdrop.addEventListener'...)

// --- "Прослушка" ПАНЕЛИ УПРАВЛЕНИЯ ---

// 1. Поиск (срабатывает на КАЖДОЕ нажатие клавиши)
searchInput.addEventListener("input", processAndDisplayItems);

// 2. Сортировка (срабатывает, когда выбрали новый <option>)
sortSelect.addEventListener("change", processAndDisplayItems);

// 3. Кнопка "Менее 5 шт."
btnShowLowStock.addEventListener("click", function() {
    // "Переключаем" ее активное состояние
    btnShowLowStock.classList.toggle("active");

    // Меняем ее стиль, чтобы было видно, что она "нажата"
    if (btnShowLowStock.classList.contains("active")) {
        btnShowLowStock.textContent = "Показать ВСЕ товары";
    } else {
        btnShowLowStock.textContent = "Показать (менее 5 шт.)";
    }

    // Запускаем "перерисовку"
    processAndDisplayItems();
});
    // (Прослушку "Сохранить" (editItemForm) мы добавим на следующем шаге)


    // --- 3. ЗАПУСКАЕМ ПРИЛОЖЕНИЕ ---
    // (Вызываем 'loadItems' в первый раз)
    loadItems();

}); // --- КОНЕЦ ГЛАВНОЙ "ОБЕРТКИ" ---

// -----------------------------------------------------------------
// ШАГ 20: "ГЛАВНЫЙ КОНТРОЛЛЕР" (Фильтрация и Сортировка)
// -----------------------------------------------------------------

/**
 * "Главный контроллер". Берет полный список, фильтрует,
 * сортирует и "отрисовывает" результат.
 */
function processAndDisplayItems() {
    // Находим элементы управления (мы ищем их здесь, а не глобально,
    // т.к. они 100% уже существуют)
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const btnShowLowStock = document.getElementById("btnShowLowStock");

    // 1. Начинаем с ПОЛНОГО списка из "памяти"
    let processedItems = [...allItems]; // '...' создает КОПИЮ массива

    // 2. --- ПРИМЕНЯЕМ ПОИСК ---
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm.length > 0) {
        processedItems = processedItems.filter(item => {
            // Ищем совпадение в "названии"
            return item.name.toLowerCase().includes(searchTerm);
        });
    }

    // 3. --- ПРИМЕНЯЕМ ФИЛЬТР "МЕНЕЕ 5 ШТ." ---
    // Проверяем, "нажата" ли кнопка (добавим ей класс 'active' позже)
    if (btnShowLowStock.classList.contains("active")) {
        processedItems = processedItems.filter(item => {
            const quantity = parseInt(item.quantity) || 0;
            return quantity > 0 && quantity < 5;
        });
    }

    // 4. --- ПРИМЕНЯЕМ СОРТИРОВКУ ---
    const sortValue = sortSelect.value;

    processedItems.sort((a, b) => {
        // 'a' и 'b' - это два товара, которые мы сравниваем
        switch (sortValue) {
            case "name-asc":
                return a.name.localeCompare(b.name); // Сравнение текста (А-Я)
            case "name-desc":
                return b.name.localeCompare(a.name); // Сравнение текста (Я-А)
            case "price-asc":
                return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0); // Числа (дешевые -> дорогие)
            case "price-desc":
                return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0); // Числа (дорогие -> дешевые)
            case "quantity-asc":
                return (parseInt(a.quantity) || 0) - (parseInt(b.quantity) || 0); // Числа (мало -> много)
            case "quantity-desc":
                return (parseInt(b.quantity) || 0) - (parseInt(a.quantity) || 0); // Числа (много -> мало)
            default:
                return 0; // "по умолчанию" - не сортировать (оставить как есть)
        }
    });

    // 5. --- ОТПРАВЛЯЕМ НА "ОТРИСОВКУ" ---
    // Отправляем финальный, "обработанный" список
    renderUI(processedItems);
}
// -----------------------------------------------------------------
// "СЛУЖЕБНЫЕ" ФУНКЦИИ (Они остаются снаружи)
// -----------------------------------------------------------------

// "Callback" для JSONP (ДОЛЖЕН быть снаружи, в "глобальном" доступе)
function handleItemResponse(data) {
    console.log("JSONP 'письмо' получено!", data);

    if (data.status === "success") {
        allItems = data.items; // "Запоминаем"
        console.log("Товары успешно получены:", allItems);
        processAndDisplayItems(); // Запускаем "Контроллер"
    } else {
        console.error("Ошибка от API в JSONP:", data.message);
        alert("Не удалось загрузить список товаров.");
    }
    const script = document.getElementById("jsonp-script");
    if (script) {
        script.remove();
    }
}

// Загружает товары (JSONP)
function loadItems() {
    console.log("Загружаем список товаров (План E: JSONP)...");

    const oldScript = document.getElementById("jsonp-script");
    if (oldScript) {
        oldScript.remove();
    }

    const script = document.createElement('script');
    script.id = "jsonp-script";
    script.src = API_URL + "?action=getItems&callback=handleItemResponse";

    document.body.appendChild(script);

    script.onerror = () => {
        console.error("Ошибка загрузки JSONP-скрипта. Проверьте URL или 'doGet'.");
        alert("Критическая ошибка при загрузке. Сервер не ответил.");
    };
}

// "Рисует" карточки и ОБНОВЛЯЕТ ШАПКУ
function renderUI(items) {

    // --- 1. СЧИТАЕМ СВОДКУ ---
    let totalCount = 0, totalPrice = 0, lowStockCount = 0;

    const summaryTotalCount = document.getElementById("summary-total-count");
    const summaryTotalPrice = document.getElementById("summary-total-price");
    const summaryLowStock = document.getElementById("summary-low-stock");

    items.forEach(item => {
        const quantity = parseInt(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        totalCount += quantity;
        totalPrice += (quantity * price);
        if (quantity > 0 && quantity < 5) {
            lowStockCount += 1;
        }
    });

    // --- 2. ОБНОВЛЯЕМ "ДИСПЛЕИ" В ШАПКЕ ---
    summaryTotalCount.textContent = totalCount;
    summaryTotalPrice.textContent = totalPrice.toLocaleString('ru-RU');
    summaryLowStock.textContent = lowStockCount;

    // --- 3. "РИСУЕМ" КАРТОЧКИ ---
    const itemsGrid = document.querySelector(".items-grid");
    itemsGrid.innerHTML = "";

    if (!items || items.length === 0) {
        itemsGrid.innerHTML = "<p>На складе пока нет товаров.</p>";
        return;
    }

    items.forEach(item => {
        const cardHTML = `
            <div class="item-card" data-id="${item.id}">
                <div class="item-card-image">
                    <img src="${item.image || 'https://via.placeholder.com/300'}"
                         alt="${item.name}"
                         onerror="this.src='https://via.placeholder.com/300'">
                </div>
                <div class="item-card-info">
                    <h3>${item.name}</h3>
                    <p class="sku">Артикул: ${item.sku || 'N/A'}</p>
                    <p>Производитель: ${item.manufacturer || 'N/A'}</p>
                    <div class="price-quantity">
                        <span class="price">${item.price || 0} руб.</span>
                        <span class="quantity">На складе: ${item.quantity || 0} шт.</span>
                    </div>
                </div>
                <div class="item-card-actions">
                    <button class="btn-edit">Редактировать</button>
                    <button class="btn-delete">Удалить</button>
                </div>
            </div>
        `;
        itemsGrid.insertAdjacentHTML("beforeend", cardHTML);
    });
}

// Удаляет товар (no-cors)
function deleteItem(itemId) {
    console.log(`Отправляем запрос на удаление (no-cors) товара ID: ${itemId}`);

    const payload = {
        action: "deleteItem",
        itemId: itemId
    };

    fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
    })
    .then(response => {
        console.log("Запрос 'deleteItem' отправлен. Считаем, что все успешно.");
        alert(`Товар (ID: ${itemId}) успешно удален!`);
        loadItems(); // Обновляем список
    })
    .catch(error => {
        console.error("Критическая ошибка при удалении:", error);
        alert("Не удалось удалить товар: " + error.message);
    });
}

// "Открывает" модальное окно
function openEditModal(itemId) {
    console.log(`Открываем окно для ID: ${itemId}`);

    const itemToEdit = allItems.find(item => item.id === itemId);

    if (!itemToEdit) {
        alert("Ошибка: Не могу найти данные для этого товара!");
        return;
    }

    // "Находим" поля ВНУТРИ функции (так надежнее)
    const editModalBackdrop = document.getElementById("editModalBackdrop");
    const editItemId = document.getElementById("editItemId");
    const editItemName = document.getElementById("editItemName");
    const editItemSku = document.getElementById("editItemSku");
    const editItemManufacturer = document.getElementById("editItemManufacturer");
    const editItemPrice = document.getElementById("editItemPrice");
    const editItemQuantity = document.getElementById("editItemQuantity");
    const editItemImage = document.getElementById("editItemImage");

    // "Заполняем" поля
    editItemId.value = itemToEdit.id;
    editItemName.value = itemToEdit.name;
    editItemSku.value = itemToEdit.sku;
    editItemManufacturer.value = itemToEdit.manufacturer;
    editItemPrice.value = itemToEdit.price;
    editItemQuantity.value = itemToEdit.quantity;
    editItemImage.value = itemToEdit.image;

    // "Показываем" окно
    editModalBackdrop.classList.add("visible");
}

// "Закрывает" модальное окно
function closeEditModal() {
    const editModalBackdrop = document.getElementById("editModalBackdrop");
    editModalBackdrop.classList.remove("visible");
}

/*
 * ===============================================================
 * ШАГ 22: ЛОГИКА "НАКЛАДНОЙ"
 * ===============================================================
 */

/**
 * Главный "переключатель" режима накладной
 */
function enterWaybillMode() {
    isWaybillModeActive = true; // "Включаем"

    console.log("Режим накладной: ВКЛЮЧЕН");
    const btn = document.getElementById("btnToggleWaybillMode");
    btn.textContent = "Показать накладную (0)";
    btn.classList.add("active"); // "Перекрашиваем" кнопку
}

/**
 * "Выбирает" или "Снимает выбор" с карточки
 */
function toggleWaybillItem(card) {
    const itemId = card.dataset.id;

    // 1. Проверяем, "выбран" ли этот товар УЖЕ?
    const existingItemIndex = waybillItems.findIndex(item => item.id === itemId);

    if (existingItemIndex > -1) {

        // --- ТОВАР УЖЕ ВЫБРАН: Снимаем выбор ---
        waybillItems.splice(existingItemIndex, 1); // Удаляем из "списка"
        card.classList.remove("selected"); // Убираем "подсветку"

    } else {

        // --- ТОВАР НЕ ВЫБРАН: Добавляем ---

        // 2. Находим "полные" данные о товаре в "памяти"
        const itemData = allItems.find(item => item.id === itemId);

        // 3. Спрашиваем "Сколько штук?"
        const quantityInStock = parseInt(itemData.quantity) || 0;

        // 'prompt' - это "всплывающее" окно с полем ввода
        let selectedQuantity = prompt(`Сколько штук "${itemData.name}" добавить? \n(На складе: ${quantityInStock} шт.)`, 1);

        // 4. "Проверяем" то, что ввел пользователь
        selectedQuantity = parseInt(selectedQuantity) || 0;

        if (selectedQuantity <= 0) {
            return; // Пользователь нажал "Отмена" или ввел 0
        }
        if (selectedQuantity > quantityInStock) {
            alert(`Ошибка: Нельзя добавить ${selectedQuantity} шт. \nНа складе осталось только ${quantityInStock} шт.`);
            return;
        }

        // 5. Все "ОК"! Добавляем в "список"
        waybillItems.push({
            ...itemData, // Копируем все данные (name, price, sku...)
            selectedQuantity: selectedQuantity // ...и добавляем "сколько выбрали"
        });

        card.classList.add("selected"); // "Подсвечиваем" карточку
    }

    // 6. Обновляем текст на "главной" кнопке
    const btn = document.getElementById("btnToggleWaybillMode");
    btn.textContent = `Показать накладную (${waybillItems.length})`;
}


/**
 * Очищает "накладную" (вызывается при выходе из "режима")
 */
function clearWaybill() {
    isWaybillModeActive = false; // "Выключаем"
    waybillItems = []; // Очищаем "список"

    console.log("Режим накладной: ВЫКЛЮЧЕН (Очищено)");

    // "Снимаем" "подсветку" (.selected) со ВСЕХ карточек
    const allCards = document.querySelectorAll(".item-card.selected");
    allCards.forEach(card => {
        card.classList.remove("selected");
    });

    // "Сбрасываем" "главную" кнопку
    const btn = document.getElementById("btnToggleWaybillMode");
    if (btn) { // (Проверка, на всякий случай)
        btn.textContent = "Создать накладную";
        btn.classList.remove("active");
    }

    // "Закрываем" Окно Накладной (если оно было открыто)
    closeWaybillModal();
}

/**
 * "ОТКРЫВАЕТ" Окно Накладной
 * (Считает, "рисует" список и "показывает" окно)
 */
function openWaybillModal() {
    const listHtml = document.getElementById("waybillItemsList");
    const totalHtml = document.getElementById("waybillTotalPrice");
    const modal = document.getElementById("waybillModalBackdrop");

    // 1. Очищаем старый список
    listHtml.innerHTML = "";

    let currentTotalPrice = 0;

    // 2. "Рисуем" новый список
    if (waybillItems.length === 0) {
        listHtml.innerHTML = "<p>Вы еще не выбрали ни одного товара.</p>";
    } else {
        waybillItems.forEach(item => {
            const itemTotal = (parseFloat(item.price) || 0) * (parseInt(item.selectedQuantity) || 0);
            currentTotalPrice += itemTotal;

            // "Рисуем" одну строку в окне
            const itemRowHTML = `
                <div class="waybill-item">
                    <span>(${item.selectedQuantity} шт.) ${item.name}</span>
                    <span class="price">${itemTotal.toLocaleString('ru-RU')} руб.</span>
                </div>
            `;
            listHtml.insertAdjacentHTML("beforeend", itemRowHTML);
        });
    }

    // 3. Обновляем "Итого"
    totalHtml.textContent = currentTotalPrice.toLocaleString('ru-RU') + " руб.";

    // 4. "Показываем" Окно
    modal.classList.add("visible");
}

/**
 * "ЗАКРЫВАЕТ" Окно Накладной
 */
function closeWaybillModal() {
    const modal = document.getElementById("waybillModalBackdrop");
    if (modal) { // (Проверяем, что нашли его)
        modal.classList.remove("visible");
    }
}
