const userList = document.querySelector('.user-list');
const addProductForm = document.getElementById('addProductForm');
const triggerPhotoBtn = document.getElementById('triggerPhotoBtn');
const productImage = document.getElementById('productImage');

async function loadUsers() {
    try {
        let response = await fetch('/admin-users');
        let users = await response.json();

        userList.innerHTML = '';

        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'user-item';
            userDiv.textContent = user.UserName;

            userDiv.addEventListener('click', async () => {
                document.querySelectorAll('.user-item').forEach(el => el.classList.remove('active'));
                userDiv.classList.add('active');

                const orderWindow = document.getElementById('adminOrderWindow');
                orderWindow.innerHTML = '<p style="color:white;">Загрузка...</p>';

                try {
                    let response = await fetch('/admin-orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json;charset=utf-8' },
                        body: JSON.stringify({ username: user.UserName })
                    });
                    let orders = await response.json();

                    orderWindow.innerHTML = '';

                    if (orders.length === 0) {
                        orderWindow.innerHTML = '<p style="color: black; font-size: 16px;">У этого пользователя нет заказов</p>';
                        return;
                    }

                    const groupedOrders = {};
                    orders.forEach(row => {
                        if (!groupedOrders[row.OrderId]) {
                            groupedOrders[row.OrderId] = [];
                        }
                        groupedOrders[row.OrderId].push(row);
                    });

                    let orderNum = 1;
                    let ordersHTML = '';

                     for (const orderId in groupedOrders) {
                        const branchAddress = groupedOrders[orderId][0].BranchAddress;

                        ordersHTML += `<div class="single-order">
                                            <div class="order-header">заказ ${orderNum}</div>`;

                        groupedOrders[orderId].forEach(item => {
                            ordersHTML += `<div class="order-row">
                                                <span class="item-name">${item.ProductName}</span>
                                                <span class="item-qty">- ${item.QuantityOrder} -</span>
                                                <span class="item-price">${item.UnitPriceCart} р.</span>
                                           </div>`;
                        });

                        ordersHTML += `<div class="order-branch">филиал: ${branchAddress}</div>`;
                        
                        ordersHTML += `</div>`;

                        if (orderNum < Object.keys(groupedOrders).length) {
                            ordersHTML += `<hr class="order-divider">`;
                        }
                        orderNum++;
                    }

                    orderWindow.innerHTML = ordersHTML;

                } catch (err) {
                    console.error("Ошибка загрузки заказов:", err);
                    orderWindow.innerHTML = '<p style="color: red;">Ошибка загрузки</p>';
                }
            });

            userList.appendChild(userDiv);
        });

    } catch (err) {
        console.error("Ошибка загрузки пользователей:", err);
        userList.innerHTML = '<p style="color: red;">Ошибка загрузки</p>';
    }
}
loadUsers();

triggerPhotoBtn.addEventListener('click', () => {
    productImage.click();
});

productImage.addEventListener('change', () => {
    if (productImage.files.length > 0) {
        const file = productImage.files[0];

        if (file.type !== 'image/png') {
            alert("Пожалуйста, выберите файл в формате PNG.");
            productImage.value = ''; 
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert("Файл слишком большой. Максимальный размер: 2 МБ.");
            productImage.value = '';
            return;
        }
    }
});

addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(addProductForm);

    try {
        let response = await fetch('/add-product', {
            method: 'POST',
            body: formData 
        });

        let result = await response.json();

        if (response.ok) {
            alert(result.message);
            addProductForm.reset();
        } else {
            alert(result.message);
        }
    } catch (err) {
        console.error("Ошибка при добавлении:", err);
        alert("Ошибка соединения с сервером");
    }
});