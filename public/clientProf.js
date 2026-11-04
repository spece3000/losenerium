const sort = document.querySelector('.choice_sort');
const shop_div = document.querySelector('.menuContain');
const query_three = document.querySelector('.querys_three');
const query_four = document.querySelector('.querys_four');
const pagination = document.querySelectorAll('.pagButton');
const all_querys_three = document.querySelectorAll('.query_three');
const all_querys_four = document.querySelectorAll('.query_four');
const logoutBtn = document.getElementById('logoutBtn');
const deleteBtn = document.getElementById('deleteBtn');

const options = { sort: "normal", pag: 1, quan: 3 };

sort.addEventListener("change", () => {
    options.sort = sort.value;
    options.pag = 1; 
    menu_change();
});

query_three.addEventListener('click', () => {
    all_querys_three.forEach(query => query.style.backgroundColor = 'white');
    all_querys_four.forEach(query => query.style.backgroundColor = '#212121');
    options.quan = 3;
    options.pag = 1;
    shop_div.classList.remove('menuContain_four');
    menu_change();
});

query_four.addEventListener('click', () => {
    all_querys_three.forEach(query => query.style.backgroundColor = '#212121');
    all_querys_four.forEach(query => query.style.backgroundColor = 'white');
    options.quan = 4;
    options.pag = 1; 
    shop_div.classList.add('menuContain_four');
    menu_change();
});

pagination.forEach((btn, i) => {
    btn.addEventListener('click', (e) => {
        options.pag = i + 1;
        pagination.forEach(b => b.style.backgroundColor = '#d3d3d3');
        btn.style.backgroundColor = '#fff';
        menu_change();
    });
});

async function menu_change() {
    try {
        let response = await fetch(`/menu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify(options)
        });
        if (!response.ok) throw new Error('Ошибка сервера');
        let result = await response.json();
        shop_div.innerHTML = ''; 
        if (result.length === 0) {
            shop_div.innerHTML = '<p style="color: black; font-size: 24px;">Товаров не найдено</p>';
            return;
        }
        result.forEach(p => sort_new(p));
    } catch (err) {
        console.error("Ошибка при загрузке меню:", err);
        shop_div.innerHTML = '<p style="color: red; font-size: 24px;">Ошибка загрузки данных</p>';
    }
}

function sort_new(p) {
    const isFour = options.quan === 4;
    const productClass = isFour ? 'product_osn_four' : 'product_osn';
    const imgClass = isFour ? 'product_img_four' : 'product_img';
    const textStylePrice = isFour ? 'font-size: 20px' : '';
    const textStyleName = isFour ? 'font-size: 30px' : '';

    shop_div.innerHTML += `<div class="product" price="${p.ProductPrice}">
                                <div class="${productClass}">
                                    <p class="product_price" style='${textStylePrice}'>${p.ProductPrice}р.</p>
                                    <img class="${imgClass}" src="${p.ProductImage}" alt="${p.ProductName}">
                                </div>
                                <p class="product_name" style='${textStyleName}'>${p.ProductName}</p>
                            </div>`;
}
menu_change();

const profName = document.getElementById('prof-name');
const profAddress = document.getElementById('prof-address');
const profEmail = document.getElementById('prof-email');

const savedName = localStorage.getItem('username');

if (!savedName) {
    window.location.href = '/index.html';
} else {
    loadProfileData(savedName);
}

async function loadProfileData(username) {
    try {
        let response = await fetch('/get-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify({ username: username })
        });

        if (response.ok) {
            let data = await response.json();
            profName.textContent = data.UserName;
            profAddress.textContent = `адрес: ${data.UserAddress}`;
            profEmail.textContent = `почта: ${data.UserEmail}`;
        } else {
            console.error("Не удалось загрузить данные профиля");
        }
    } catch (err) {
        console.error("Ошибка соединения:", err);
    }
}

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('username');
    window.location.href = '/index.html';
});

deleteBtn.addEventListener('click', async () => {
    const isConfirmed = confirm("Вы уверены, что хотите полностью удалить свой аккаунт? Это действие нельзя отменить!");
        
    if (!isConfirmed) return;

    try {
        let response = await fetch('/delete-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify({ username: savedName })
        });

        let result = await response.json();

        if (response.ok) {
            alert(result.message);
            localStorage.removeItem('username'); 
            window.location.href = '/index.html'; 
        } else {
            alert(result.message);
        }
    } catch (err) {
        console.error("Ошибка при удалении:", err);
        alert("Ошибка соединения с сервером");
    }
});
