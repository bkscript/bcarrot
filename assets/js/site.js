(() => {
  const store = window.MARWARMADE_STORE || { ordersOpen: false, currency: "INR", products: [] };
  const siteRoot = new URL("../../", document.currentScript.src);
  const siteHref = (path) => new URL(String(path).replace(/^\/+/, ""), siteRoot).href;
  const basketKey = "marwarmade-basket";
  const menuButton = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");

  const productById = (id) => store.products.find((product) => product.id === id);
  const formatPrice = (price) => new Intl.NumberFormat("en-IN", {
    style: "currency", currency: store.currency || "INR", maximumFractionDigits: 0
  }).format(price);
  const readBasket = () => {
    try {
      const basket = JSON.parse(localStorage.getItem(basketKey));
      return Array.isArray(basket) ? basket.filter((item) => productById(item.id)) : [];
    } catch { return []; }
  };
  const saveBasket = (basket) => localStorage.setItem(basketKey, JSON.stringify(basket));
  const basketCount = () => readBasket().reduce((total, item) => total + Number(item.quantity || 0), 0);
  const updateCartCount = () => document.querySelectorAll("[data-cart-count]").forEach((element) => {
    element.textContent = String(basketCount());
  });

  if (menuButton && menu) {
    menuButton.addEventListener("click", () => {
      const open = !menu.classList.contains("is-open");
      menu.classList.toggle("is-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
    });
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
    }));
  }

  document.querySelectorAll("[data-year]").forEach((element) => { element.textContent = new Date().getFullYear(); });
  document.querySelectorAll("[data-product-price]").forEach((element) => {
    const product = productById(element.dataset.productPrice);
    if (product?.price !== null && product?.price !== undefined) element.textContent = formatPrice(product.price);
  });

  document.querySelectorAll("[data-product-variants]").forEach((group) => {
    const productArea = group.closest(".product-detail-copy") || document;
    const priceElement = productArea.querySelector("[data-product-price]");
    const mrpElement = productArea.querySelector("[data-product-mrp]");
    const sizeElement = productArea.querySelector("[data-product-size]");
    const addButton = productArea.querySelector("[data-add-to-basket]");
    const galleryImage = group.closest(".product-detail")?.querySelector(".product-gallery img");
    const chooseVariant = (id) => {
      const product = productById(id);
      if (!product) return;
      group.querySelectorAll("[data-product-variant]").forEach((option) => {
        const selected = option.dataset.productVariant === id;
        option.classList.toggle("is-selected", selected);
        option.setAttribute("aria-pressed", String(selected));
      });
      if (priceElement) {
        priceElement.dataset.productPrice = id;
        priceElement.textContent = formatPrice(product.price);
      }
      if (mrpElement) {
        const hasMrp = Number.isFinite(product.mrp) && product.mrp > product.price;
        mrpElement.hidden = !hasMrp;
        mrpElement.textContent = hasMrp ? `MRP ${formatPrice(product.mrp)}` : "";
      }
      if (sizeElement) sizeElement.textContent = product.size;
      if (addButton) addButton.dataset.productId = id;
      if (galleryImage) {
        galleryImage.src = siteHref(product.image);
        galleryImage.alt = `${product.name} ${product.size} pack`;
      }
    };
    group.querySelectorAll("[data-product-variant]").forEach((option) => {
      option.addEventListener("click", () => chooseVariant(option.dataset.productVariant));
    });
  });

  const addToBasket = (id, quantity = 1) => {
    const product = productById(id);
    if (!product || product.price === null || product.price === undefined) return false;
    const basket = readBasket();
    const current = basket.find((item) => item.id === id);
    if (current) current.quantity += quantity;
    else basket.push({ id, quantity });
    saveBasket(basket);
    updateCartCount();
    return true;
  };

  const quantityOutput = document.querySelector("[data-product-quantity]");
  let quantity = 1;
  document.querySelector("[data-quantity-minus]")?.addEventListener("click", () => {
    quantity = Math.max(1, quantity - 1);
    if (quantityOutput) quantityOutput.textContent = String(quantity);
  });
  document.querySelector("[data-quantity-plus]")?.addEventListener("click", () => {
    quantity = Math.min(99, quantity + 1);
    if (quantityOutput) quantityOutput.textContent = String(quantity);
  });

  document.querySelectorAll("[data-add-to-basket]").forEach((button) => {
    const product = productById(button.dataset.productId);
    if (product?.price === null || product?.price === undefined) {
      button.textContent = "Unavailable";
      button.disabled = true;
      button.setAttribute("aria-describedby", "basket-message");
      document.querySelectorAll("[data-quantity-minus], [data-quantity-plus]").forEach((control) => { control.disabled = true; });
    }
  });

  document.querySelectorAll("[data-add-to-basket]").forEach((button) => button.addEventListener("click", (event) => {
    const productId = event.currentTarget.dataset.productId;
    const message = document.querySelector("[data-basket-message]");
    const wasAdded = addToBasket(productId, quantity);
    if (message) {
      message.textContent = wasAdded ? `${quantity} pouch${quantity > 1 ? "es" : ""} added to your basket.` : "Ordering is not open yet. Label and delivery details will be published before checkout is enabled.";
      message.classList.toggle("is-added", wasAdded);
    }
    if (wasAdded && event.currentTarget.classList.contains("product-add-button")) {
      const addButton = event.currentTarget;
      addButton.textContent = "ADDED";
      window.setTimeout(() => { addButton.textContent = "ADD"; }, 900);
    }
  }));

  const renderCart = () => {
    const cartRoot = document.querySelector("[data-cart-root]");
    if (!cartRoot) return;
    const basket = readBasket();
    if (!basket.length) {
      cartRoot.innerHTML = `<div class="empty-state"><p class="eyebrow">Your basket is empty</p><h1>Start with the <em>spice shelf.</em></h1><p>Explore Lal Mirch, Haldi and Dhaniya for the everyday dishes you cook most.</p><a class="button button--primary" href="${siteHref("products/")}">Shop spices <span aria-hidden="true">&rarr;</span></a></div>`;
      return;
    }
    const canCalculate = basket.every(({ id }) => Number.isFinite(productById(id)?.price));
    const canOrder = store.ordersOpen && canCalculate;
    const rows = basket.map(({ id, quantity }) => {
      const product = productById(id);
      const lineTotal = canCalculate ? formatPrice(product.price * quantity) : "Price coming soon";
      return `<article class="cart-item"><a class="cart-item-image" href="${siteHref(product.href)}"><img src="${siteHref(product.image)}" alt="${product.name} pouch"></a><div class="cart-item-copy"><p class="product-kind">Everyday spice &bull; ${product.size}</p><h2><a href="${siteHref(product.href)}">${product.name}</a></h2><p>${product.ingredient}</p><button class="cart-remove" type="button" data-cart-remove="${id}">Remove</button></div><div class="cart-item-quantity"><label for="quantity-${id}">Quantity</label><select id="quantity-${id}" data-cart-quantity="${id}">${Array.from({ length: 10 }, (_, index) => `<option value="${index + 1}"${index + 1 === quantity ? " selected" : ""}>${index + 1}</option>`).join("")}</select></div><strong class="cart-item-price">${lineTotal}</strong></article>`;
    }).join("");
    const total = canCalculate ? formatPrice(basket.reduce((sum, item) => sum + productById(item.id).price * item.quantity, 0)) : "Price coming soon";
    const orderButton = canOrder ? `<a class="button button--primary" href="${siteHref("order/checkout.html")}">Continue to checkout <span aria-hidden="true">&rarr;</span></a>` : `<a class="button button--primary" href="${siteHref("support/contact.html")}">Ask about launch <span aria-hidden="true">&rarr;</span></a>`;
    const note = canOrder ? "Taxes and delivery options will be shown at checkout." : "Prices are listed; ordering will open after pack declarations, support and delivery details are published.";
    cartRoot.innerHTML = `<div class="cart-layout"><section class="cart-items">${rows}</section><aside class="cart-summary"><p class="eyebrow">Order summary</p><div><span>Subtotal</span><strong>${total}</strong></div><p>${note}</p>${orderButton}<a class="text-link" href="${siteHref("products/")}">Continue shopping</a></aside></div>`;
    cartRoot.querySelectorAll("[data-cart-remove]").forEach((button) => button.addEventListener("click", () => {
      saveBasket(readBasket().filter((item) => item.id !== button.dataset.cartRemove)); updateCartCount(); renderCart();
    }));
    cartRoot.querySelectorAll("[data-cart-quantity]").forEach((select) => select.addEventListener("change", () => {
      const basketNow = readBasket(); const item = basketNow.find((entry) => entry.id === select.dataset.cartQuantity);
      if (item) { item.quantity = Number(select.value); saveBasket(basketNow); updateCartCount(); renderCart(); }
    }));
  };

  const renderCheckout = () => {
    const checkoutRoot = document.querySelector("[data-checkout-root]");
    if (!checkoutRoot) return;
    const basket = readBasket();
    const canCheckout = store.ordersOpen && basket.length && basket.every(({ id }) => Number.isFinite(productById(id)?.price));
    if (!canCheckout) {
      checkoutRoot.innerHTML = `<div class="empty-state"><p class="eyebrow">Checkout is not open</p><h1>We are still finalising the <em>details.</em></h1><p>Final prices, pack declarations, delivery terms and customer support details are required before we accept an order.</p><a class="button button--primary" href="${siteHref("order/cart.html")}">Back to basket <span aria-hidden="true">&larr;</span></a></div>`;
      return;
    }
    const total = basket.reduce((sum, item) => sum + productById(item.id).price * item.quantity, 0);
    checkoutRoot.innerHTML = `<div class="checkout-layout"><form class="checkout-form" data-order-form><p class="eyebrow">Delivery details</p><h1>Where should we send your <em>spices?</em></h1><div class="field-grid"><label>Full name<input name="name" autocomplete="name" required></label><label>Phone number<input name="phone" type="tel" autocomplete="tel" required></label></div><label>Email address<input name="email" type="email" autocomplete="email"></label><label>Address<input name="address" autocomplete="street-address" required></label><div class="field-grid"><label>City<input name="city" autocomplete="address-level2" required></label><label>PIN code<input name="pincode" inputmode="numeric" pattern="[0-9]{6}" required></label></div><button class="button button--primary" type="submit">Place order request <span aria-hidden="true">&rarr;</span></button><p class="form-note">Payment and dispatch will only be confirmed after MarwarMade contacts you.</p><p class="form-status" data-order-status aria-live="polite"></p></form><aside class="cart-summary"><p class="eyebrow">Your order</p>${basket.map((item) => `<div><span>${productById(item.id).name} &times; ${item.quantity}</span><strong>${formatPrice(productById(item.id).price * item.quantity)}</strong></div>`).join("")}<div class="summary-total"><span>Total</span><strong>${formatPrice(total)}</strong></div></aside></div>`;
    checkoutRoot.querySelector("[data-order-form]").addEventListener("submit", (event) => {
      event.preventDefault();
      const status = checkoutRoot.querySelector("[data-order-status]");
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const order = { id: `MM-${Date.now().toString().slice(-6)}`, createdAt: new Date().toISOString(), customer: values, items: basket, total };
      localStorage.setItem("marwarmade-last-order-request", JSON.stringify(order));
      status.textContent = `Order request ${order.id} is saved on this device. Connect a payment or WhatsApp order handler before publishing this checkout.`;
      status.classList.add("is-added");
    });
  };

  updateCartCount();
  renderCart();
  renderCheckout();
})();
