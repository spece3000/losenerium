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

            userDiv.addEventListener('click', () => {
                document.querySelectorAll('.user-item').forEach(el => el.classList.remove('active'));
                userDiv.classList.add('active');
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