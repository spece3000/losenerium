const options = document.querySelector('.choice_sort');
const shop_div = document.querySelector('.menuContain');
const tovars = document.querySelectorAll('.product');
const tovar_img = document.querySelectorAll('.product_img');
const tovar_title = document.querySelectorAll('.product_name');
const tovar_osn = document.querySelectorAll('.product_osn');
const query_three = document.querySelector('.querys_three');
const query_four = document.querySelector('.querys_four');
const all_querys_three = document.querySelectorAll('.query_three');
const all_querys_four = document.querySelectorAll('.query_four');

query_three.addEventListener('click', () =>{
    all_querys_three.forEach(query => {
        query.style.backgroundColor = 'white';
    });
    all_querys_four.forEach(query => {
        query.style.backgroundColor = '#212121';
    });
    shop_div.classList.replace("menuContain_four", "menuContain");
    tovar_img.forEach(img => {
        img.classList.replace("product_img_four", "product_img");
    });
    tovar_osn.forEach(osn => {
        osn.classList.replace("product_osn_four", "product_osn");
    });
});
query_four.addEventListener('click', () =>{
    all_querys_three.forEach(query => {
        query.style.backgroundColor = '#212121';
    });
    all_querys_four.forEach(query => {
        query.style.backgroundColor = 'white';
    });
    shop_div.classList.replace("menuContain", "menuContain_four");
    tovar_img.forEach(img => {
        img.classList.replace("product_img", "product_img_four");
    });
    tovar_osn.forEach(osn => {
        osn.classList.replace("product_osn", "product_osn_four");
    });
});

function sort(){
    let array_normal_zen = [];
    let tovars_array = [];
    let array_up = [];
    let array_down = [];
    let array_img = [];
    let array_normal_super = [];
    let array_title = [];

    tovar_title.forEach(tovar => {
        array_title.push(tovar.textContent);
    })

    tovars.forEach(tovar => {
        array_normal_zen.push(tovar.getAttribute('price'));
    });

    tovar_img.forEach(tovar =>{
        array_img.push(tovar.getAttribute('src'));
    })

    for (let i = 0; i < tovars.length; i++) {
        tovars_array.push({text: array_title[i], zena: array_normal_zen[i], img: array_img[i]},);
    }

    tovars_array.forEach(div => {
        array_normal_super.push(div);
    });

    tovars_array.sort((a, b) => a.zena - b.zena);
    tovars_array.forEach(div => {
        array_up.push(div);
    });

    tovars_array.sort((a, b) => b.zena - a.zena);
    tovars_array.forEach(div => {
        array_down.push(div);
    });

    if(options.value === "normal"){
        shop_div.innerHTML = ``;
        array_normal_super.forEach(p => {
            sort_new(p);
        });
    }
    else if(options.value === "up_price"){
        shop_div.innerHTML = ``;
        array_up.forEach(p => {
            sort_new(p);
        });
    }
    else if(options.value === "down_price"){
        shop_div.innerHTML = ``;
        array_down.forEach(p => {
            sort_new(p);
        });
    }
}

function sort_new(p){
    shop_div.innerHTML +=   `<div class="product" price="${p.zena}">
                                <div class="product_osn">
                                    <p class="product_price">${p.zena}р.</p>
                                    <img class="product_img"  src="${p.img}" alt="${p.text}">
                                </div>
                                <p class="product_name">${p.text}</p>
                            </div>`;
}

options.addEventListener("change", (e) =>{
    e.preventDefault();
    sort();
});