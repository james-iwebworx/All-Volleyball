(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-T92MBWGV');

function processCheckoutEvent(event, eventName) {
    console.log(eventName);

    // Helper function to calculate total discount and coupon code
    function getDiscountsAndCoupon(discountApplications) {
        let totalDiscount = 0;
        let coupon = '';
        const discountCodes = discountApplications.map(function (discount) {
            totalDiscount += discount.value.amount;
            return discount.title;
        });
        if (discountCodes.length > 0) {
            coupon = discountCodes[0];
        }
        return { totalDiscount, coupon };
    }

    // Initialize base object with common properties
    const { totalDiscount, coupon } = getDiscountsAndCoupon(event.data.checkout.discountApplications);
    const baseObject = {
        event: eventName,
        cartTotal: event.data.checkout.totalPrice.amount,
        fired_from: 'custom_pixel',
        currency: event.data.checkout.currencyCode,
        value: event.data.checkout.totalPrice.amount,
        ecommerce: {
            items: event.data.checkout.lineItems.map(lineItem => ({
                item_id: `${lineItem.variant.product.id} - ${lineItem.variant.id}`,
                item_name: `${lineItem.variant.product.title} - ${lineItem.variant.title}`,
                coupon,
                currency: event.data.checkout.currencyCode,
                discount: totalDiscount,
                item_brand: lineItem.variant.product.vendor || "Death Wish Coffee Company",
                item_category: lineItem.variant.product.type,
                item_variant: lineItem.variant.sku,
                price: lineItem.variant.price.amount,
                quantity: lineItem.quantity,
            })),
        },
        ...(eventName === "purchase" && { transaction_id: event.data.checkout.order.id }),
    };

    // Specific event properties
    if (["add_shipping_info", "add_payment_info", "purchase"].includes(eventName)) {
        if (event.data.checkout.shippingLine) {
            baseObject.shipping_price = event.data.checkout.shippingLine.price.amount;
        }
        if (event.data.checkout.discountApplications.length > 0) {
            baseObject.coupon = event.data.checkout.discountApplications.map(discount => discount.title).join(', ');
        }
        if (eventName === "purchase") {
            baseObject.tax = event.data.checkout.totalTax.amount;
        }
        if(event.data.checkout.transactions.length > 0) {
            baseObject.payment_type = event.data.checkout.transactions[0].gateway;
        }
    }

    window.dataLayer.push(baseObject);
}

analytics.subscribe('cart_viewed', (event) => {
    const totalCartCost = event.data.cart.cost.totalAmount.amount;
    const cartItems = event.data.cart.lines.map((lineItem) => ({
        item_sku: lineItem.merchandise.product.sku,
        item_title: lineItem.merchandise.product.title,
        item_price: lineItem.merchandise.price,
        item_quantity: lineItem.quantity,
        item_total_price: lineItem.cost.totalAmount,
    }));
    window.dataLayer.push({
    'event': 'view_cart',
        'fired_from': 'custom_pixel',
        'cart_total_cost': totalCartCost,
        'cart_items': cartItems
    });
});

analytics.subscribe('collection_viewed', (event) => {
    window.dataLayer.push({
    'event': 'view_item_list',
        'fired_from': 'custom_pixel',
        'collection': event.data.collection.title
    });
});

analytics.subscribe('page_viewed', (event) => {
    window.dataLayer.push({
        'event': 'page_view',
        'page_location': event.context.window.location.href,
        'page_title': event.context.document.title,
        'fired_from': 'custom_pixel',
        'page': event.data
    });
});

analytics.subscribe('product_added_to_cart', (event) => {
    const cartLine = event.data.cartLine;
    window.dataLayer.push({
        'event': 'add_to_cart',
        'fired_from': 'custom_pixel',
        'item_sku': cartLine.merchandise.product.sku,
        'item_title': cartLine.merchandise.product.title,
        'item_price': cartLine.merchandise.price,
        'item_quantity': cartLine.quantity,
        'item_total': cartLine.cost.totalAmount
    });
});

analytics.subscribe('product_removed_from_cart', (event) => {
    const cartLine = event.data.cartLine;
    window.dataLayer.push({
        'event': 'remove_from_cart',
        'fired_from': 'custom_pixel',
        'item_sku': cartLine.merchandise.product.sku,
        'item_title': cartLine.merchandise.product.title,
        'item_price': cartLine.merchandise.price,
        'item_quantity': cartLine.quantity,
        'item_total': cartLine.cost.totalAmount
    });
});

analytics.subscribe('product_viewed', (event) => {
    const variant = event.data.productVariant;

    window.dataLayer.push({
        'event': 'view_item',
        'fired_from': 'custom_pixel',
        'product_title': event.data.productVariant.product.title,
        'product_url': event.data.productVariant.product.url,
        'variant_title': event.data.productVariant.title,
        'variant_id': event.data.productVariant.id,
        'variant_price': event.data.productVariant.price
    });
});

analytics.subscribe('search_submitted', (event) => {
    window.dataLayer.push({
        'event': 'view_search_results',
        'fired_from': 'custom_pixel',
        'search_query': event.data.searchResult.query
    });
});

analytics.subscribe("checkout_started", (event) => {
    processCheckoutEvent(event, "begin_checkout");
});

analytics.subscribe("checkout_contact_info_submitted", (event) => {
    processCheckoutEvent(event, "add_contact_info");
});

analytics.subscribe("checkout_address_info_submitted", (event) => {
  processCheckoutEvent(event, "add_shipping_info");
});

analytics.subscribe("checkout_shipping_info_submitted", (event) => {
    processCheckoutEvent(event, "add_shipping_info");
});

analytics.subscribe("payment_info_submitted", (event) => {
    processCheckoutEvent(event, "add_payment_info");
});

analytics.subscribe("checkout_completed", (event) => {
    processCheckoutEvent(event, "purchase");
});
